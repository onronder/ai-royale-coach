import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate in-game display level from API card data
 * Universal formula: displayLevel = level + (16 - maxLevel)
 * This applies to ALL rarities. Evolution does NOT affect display level.
 */
function getDisplayLevel(card: { level: number; maxLevel?: number; evolutionLevel?: number }): number {
  // If maxLevel not provided, assume Common (maxLevel = 16, offset = 0)
  const maxLevel = card.maxLevel ?? 16;
  return card.level + (16 - maxLevel);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables are not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // SECURITY FIX: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription status
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, trial_used')
      .eq('id', user.id)
      .single();

    const now = new Date();
    const isTrialActive = profile?.trial_ends_at && 
      new Date(profile.trial_ends_at) > now;
    const hasAccess = subscription?.status === 'active' || isTrialActive;

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Subscription required for AI analysis', subscription_required: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { playerData, battles, language = 'en' } = await req.json();
    
    if (!playerData || !battles) {
      return new Response(
        JSON.stringify({ error: 'Player data and battles are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to normalize player tags (database stores without #)
    const normalizePlayerTag = (tag: string): string => {
      return tag.replace(/^#/, '').toUpperCase();
    };

    // PER-PLAYER AI ACCESS CHECK (bypassed for trial users - all accounts get AI during trial)
    if (playerData.tag && !isTrialActive) {
      const normalizedTag = normalizePlayerTag(playerData.tag);
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('ai_enabled')
        .eq('user_id', user.id)
        .eq('player_tag', normalizedTag)
        .single();

      if (!playerProfile?.ai_enabled) {
        return new Response(
          JSON.stringify({ 
            error: 'AI not enabled for this account',
            ai_not_enabled: true,
            player_tag: playerData.tag
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Language instruction based on user preference
    const languageInstructions: Record<string, string> = {
      en: 'Respond in English.',
      es: 'Responde en español.',
      pt: 'Responda em português.',
      tr: 'Türkçe yanıt ver.',
      fr: 'Réponds en français.',
    };
    const languageInstruction = languageInstructions[language] || languageInstructions.en;

    // Create fingerprint for caching
    const recentBattleIds = battles.slice(0, 5).map((b: any) => b.battleTime).join(',');
    const fingerprint = `profile_${playerData.tag}_${playerData.trophies}_${recentBattleIds}_${language}`;

    // Check cache
    const { data: cached } = await supabase
      .from('analyses')
      .select('output')
      .eq('player_tag', playerData.tag)
      .eq('analysis_type', 'profile_summary')
      .eq('input_fingerprint', fingerprint)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h cache
      .single();

    if (cached) {
      console.log('Returning cached analysis');
      return new Response(
        JSON.stringify(cached.output),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate stats
    const recentBattles = battles.slice(0, 20);
    const wins = recentBattles.filter((b: any) => 
      (b.team[0]?.crowns || 0) > (b.opponent[0]?.crowns || 0)
    ).length;
    const winRate = (wins / recentBattles.length) * 100;
    
    const avgTrophyChange = recentBattles.reduce((sum: number, b: any) => 
      sum + (b.team[0]?.trophyChange || 0), 0
    ) / recentBattles.length;

    // Prepare prompt
    const prompt = `Analyze this Clash Royale player's profile and provide insights:

Player: ${playerData.name}
Tag: ${playerData.tag}
Trophies: ${playerData.trophies} (Best: ${playerData.bestTrophies})
Arena: ${playerData.arena?.name || 'Unknown'}
${playerData.clan ? `Clan: ${playerData.clan.name}` : 'No clan'}

Recent Performance (last 20 battles):
- Win Rate: ${winRate.toFixed(1)}%
- Average Trophy Change: ${avgTrophyChange >= 0 ? '+' : ''}${avgTrophyChange.toFixed(1)}
- Wins: ${wins}, Losses: ${recentBattles.length - wins}

Current Deck:
${playerData.currentDeck?.map((c: any) => `- ${c.name} (Lv ${getDisplayLevel(c)}${c.evolutionLevel ? ' EVO' : ''})`).join('\n') || 'No deck data'}

Battle Types Distribution:
${Object.entries(
  recentBattles.reduce((acc: any, b: any) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {})
).map(([type, count]) => `- ${type}: ${count} battles`).join('\n')}

Provide a concise analysis (max 150 words) covering:
1. **Strengths**: What they're doing well
2. **Weaknesses**: Areas needing improvement
3. **Key Recommendations**: 2-3 actionable suggestions

Be specific, competitive, and encouraging. Focus on actionable insights.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert Clash Royale coach. Provide clear, actionable insights that help players improve. Be encouraging but honest about areas for improvement. ${languageInstruction}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    const result = {
      analysis,
      stats: {
        winRate: winRate.toFixed(1),
        avgTrophyChange: avgTrophyChange.toFixed(1),
        recentWins: wins,
        recentLosses: recentBattles.length - wins,
      }
    };

    // Cache the result
    await supabase.from('analyses').insert({
      player_tag: playerData.tag,
      analysis_type: 'profile_summary',
      input_fingerprint: fingerprint,
      output: result,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-player function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
