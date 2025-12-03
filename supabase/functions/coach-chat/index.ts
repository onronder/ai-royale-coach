import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_AI_LIMIT = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    // SUBSCRIPTION CHECK: Verify user has active subscription or trial
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
        JSON.stringify({ 
          error: 'Subscription required to use AI features',
          subscription_required: true 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SERVER-SIDE AI QUOTA CHECK
    const today = new Date().toISOString().split('T')[0];
    
    // Check current usage
    const { data: usageData, error: usageError } = await supabase
      .from('user_ai_usage')
      .select('request_count')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error checking AI quota:', usageError);
    }

    const currentCount = usageData?.request_count || 0;
    
    if (currentCount >= DAILY_AI_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily AI quota exceeded. Please try again tomorrow.',
          quota_exceeded: true,
          requests_used: currentCount,
          daily_limit: DAILY_AI_LIMIT
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment usage count
    if (usageData) {
      await supabase
        .from('user_ai_usage')
        .update({ request_count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('date', today);
    } else {
      await supabase
        .from('user_ai_usage')
        .insert({ user_id: user.id, date: today, request_count: 1 });
    }

    const { messages, playerTag, playerStats, recentMatches, savedDecks, cardMastery, achievements, cardCollection, language = 'en' } = await req.json();

    // PER-PLAYER AI ACCESS CHECK
    if (playerTag) {
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('ai_enabled')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .single();

      if (!playerProfile?.ai_enabled) {
        return new Response(
          JSON.stringify({ 
            error: 'AI not enabled for this account',
            ai_not_enabled: true,
            player_tag: playerTag
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

    // Build comprehensive context-aware system prompt
    let systemPrompt = `You are an expert Clash Royale AI coach with full access to the player's profile. You provide strategic advice, deck recommendations, and gameplay tips based on their complete game data.

LANGUAGE INSTRUCTION: ${languageInstruction}

IMPORTANT RULES:
- Never provide advice on cheating, hacking, or exploiting bugs
- Never share or discuss methods to violate Supercell's Terms of Service
- If asked about cheating methods, politely refuse and redirect to legitimate improvement strategies
- Focus on skill development, strategy, and fair play

${playerStats ? `Player Stats:
- Trophies: ${playerStats.trophies}
- Best Trophies: ${playerStats.bestTrophies}
- Arena: ${playerStats.arena}
- Win Rate: ${playerStats.winRate}%` : ''}

${recentMatches ? `Recent Performance:
- Last 10 matches: ${recentMatches.wins}W-${recentMatches.losses}L
- Average trophy change: ${recentMatches.avgTrophyChange}` : ''}

${savedDecks?.length > 0 ? `Saved Decks (${savedDecks.length} total):
${savedDecks.slice(0, 3).map((deck: any, i: number) => `${i + 1}. ${deck.name} - ${deck.win_rate ? deck.win_rate.toFixed(1) + '% WR' : 'No stats yet'}`).join('\n')}` : ''}

${cardMastery?.length > 0 ? `Top Mastered Cards (${cardMastery.length} tracked):
${cardMastery.slice(0, 5).map((card: any, i: number) => `${i + 1}. ${card.card_name} - Level ${card.mastery_level || 1}, ${card.times_used || 0} uses, ${card.battles_won || 0}W-${card.battles_lost || 0}L`).join('\n')}` : ''}

${achievements?.length > 0 ? `Achievements Unlocked: ${achievements.filter((a: any) => a.unlocked_at).length}/${achievements.length}` : ''}

${cardCollection?.length > 0 ? `Card Collection: ${cardCollection.length} cards tracked` : ''}

Guidelines:
- Be concise and actionable
- Focus on specific improvements based on their actual data
- Reference their saved decks, card mastery, and achievements
- Suggest deck improvements using cards they've mastered
- Use gaming terminology but stay professional
- Provide personalized strategies based on their playstyle`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Coach chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
