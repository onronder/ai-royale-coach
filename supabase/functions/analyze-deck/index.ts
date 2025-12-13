import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeckAnalysisRequest {
  playerData: any;
  battles: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // RATE LIMITING: Prevent enumeration attacks (60 requests per minute per IP)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitIdentifier = `analyze-deck:${clientIP}`;
    
    const { data: rateLimitAllowed, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', { 
        p_identifier: rateLimitIdentifier, 
        p_max_requests: 60, 
        p_window_seconds: 60 
      });
    
    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (!rateLimitAllowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      .select('trial_ends_at')
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

    const { playerData, battles, language = 'en' }: DeckAnalysisRequest & { language?: string } = await req.json();

    // Helper to normalize player tags (database stores without #)
    const normalizePlayerTag = (tag: string): string => {
      return tag.replace(/^#/, '').toUpperCase();
    };

    // PER-PLAYER AI ACCESS CHECK (bypassed for trial users - all accounts get AI during trial)
    if (playerData?.tag && !isTrialActive) {
      const playerTag = normalizePlayerTag(playerData.tag);
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
            player_tag: playerData.tag
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Language instruction based on user preference
    const languageInstructions: Record<string, string> = {
      en: 'Respond in English. All text content must be in English.',
      es: 'Responde en español. Todo el contenido de texto debe estar en español.',
      pt: 'Responda em português. Todo o conteúdo de texto deve estar em português.',
      tr: 'Türkçe yanıt ver. Tüm metin içeriği Türkçe olmalıdır.',
      fr: 'Réponds en français. Tout le contenu textuel doit être en français.',
    };
    const languageInstruction = languageInstructions[language] || languageInstructions.en;

    // Fetch all archetypes
    const { data: archetypes, error: archetypesError } = await supabase
      .from('deck_archetypes')
      .select('*');

    if (archetypesError) throw archetypesError;

    const currentDeck = playerData.currentDeck || [];
    const deckCards = currentDeck.map((c: any) => c.name);

    // Detect player's archetype
    let detectedArchetype = archetypes[0]; // default
    let maxMatches = 0;

    for (const archetype of archetypes) {
      const matches = archetype.key_cards.filter((card: string) => 
        deckCards.some((deckCard: string) => deckCard.toLowerCase().includes(card.toLowerCase()))
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedArchetype = archetype;
      }
    }

    // Analyze win rates vs different archetypes
    const archetypeStats = new Map<string, { wins: number; losses: number }>();

    for (const battle of battles.slice(0, 25)) {
      const playerTeam = battle.team.find((p: any) => p.tag === playerData.tag);
      const opponent = battle.opponent[0];
      
      if (!playerTeam || !opponent) continue;

      const isWin = playerTeam.crowns > opponent.crowns;
      const opponentCards = opponent.cards.map((c: any) => c.name);

      // Detect opponent archetype
      let opponentArchetype = 'Unknown';
      let maxOpponentMatches = 0;

      for (const archetype of archetypes) {
        const matches = archetype.key_cards.filter((card: string) =>
          opponentCards.some((opCard: string) => opCard.toLowerCase().includes(card.toLowerCase()))
        ).length;

        if (matches > maxOpponentMatches) {
          maxOpponentMatches = matches;
          opponentArchetype = archetype.name;
        }
      }

      const stats = archetypeStats.get(opponentArchetype) || { wins: 0, losses: 0 };
      if (isWin) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      archetypeStats.set(opponentArchetype, stats);
    }

    const archetypeWinRates = Array.from(archetypeStats.entries())
      .map(([archetype, stats]) => ({
        archetype,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.wins + stats.losses > 0 
          ? (stats.wins / (stats.wins + stats.losses)) * 100 
          : 0
      }))
      .filter(a => a.wins + a.losses >= 2)
      .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));

    // Get AI recommendations using structured tool calling
    const prompt = `Analyze this Clash Royale deck:

**Archetype:** ${detectedArchetype.name} (${detectedArchetype.playstyle})
**Current Deck:** ${deckCards.join(', ')}
**Win Rate Data:** ${archetypeWinRates.map(a => `${a.archetype}: ${a.winRate.toFixed(0)}% (${a.wins}W-${a.losses}L)`).join(', ')}

Based on the detected archetype and performance data, analyze:
1. 3 key strengths of this deck
2. 3 weaknesses or vulnerability areas  
3. 3 specific recommendations for improvement

Be specific about card interactions and matchups. Each point should be 1-2 sentences.
${languageInstruction}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert Clash Royale deck builder and strategist. ${languageInstruction}` 
          },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_deck_results",
              description: "Return structured deck analysis with strengths, weaknesses, and recommendations",
              parameters: {
                type: "object",
                properties: {
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 key strengths of the deck (in user's language)"
                  },
                  weaknesses: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 key weaknesses or vulnerabilities (in user's language)"
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 specific improvement recommendations (in user's language)"
                  },
                  archetype_tips: {
                    type: "string",
                    description: "Brief tips for playing this archetype (in user's language)"
                  }
                },
                required: ["strengths", "weaknesses", "recommendations", "archetype_tips"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_deck_results" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error('No tool call returned from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        archetype: {
          name: detectedArchetype.name,
          playstyle: detectedArchetype.playstyle,
          tips: analysis.archetype_tips || detectedArchetype.tips,
        },
        archetypeWinRates,
        strengths: analysis.strengths.slice(0, 3),
        weaknesses: analysis.weaknesses.slice(0, 3),
        recommendations: analysis.recommendations.slice(0, 3),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-deck:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});