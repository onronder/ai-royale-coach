import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized - missing authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return errorResponse('Unauthorized - invalid token', 401);
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
      return errorResponse('Subscription required for AI deck analysis', 403, { subscription_required: true });
    }

    const { cards, playerTag, language = 'en' } = await req.json();
    
    if (!cards || cards.length !== 8) {
      throw new Error('Deck must contain exactly 8 cards');
    }

    // Helper to normalize player tags
    const normalizePlayerTag = (tag: string): string => {
      return tag.replace(/^#/, '').toUpperCase();
    };

    // PER-PLAYER AI ACCESS CHECK
    if (playerTag && !isTrialActive) {
      const normalizedTag = normalizePlayerTag(playerTag);
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('ai_enabled')
        .eq('user_id', user.id)
        .eq('player_tag', normalizedTag)
        .single();

      if (!playerProfile?.ai_enabled) {
        return errorResponse('AI not enabled for this account', 403, { ai_not_enabled: true, player_tag: playerTag });
      }
    }

    // Language instruction
    const languageInstructions: Record<string, string> = {
      en: 'Respond in English.',
      es: 'Responde en español.',
      pt: 'Responda em português.',
      tr: 'Türkçe yanıt ver.',
      fr: 'Réponds en français.',
    };
    const languageInstruction = languageInstructions[language] || languageInstructions.en;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const cardList = cards.map((c: any) => `${c.name} (${c.elixirCost} elixir, ${c.rarity})`).join(', ');
    const avgElixir = cards.reduce((sum: number, c: any) => sum + (c.elixirCost || 0), 0) / 8;

    const prompt = `You are an expert Clash Royale deck analyst. ${languageInstruction} Analyze this deck composition:

${cardList}
Average Elixir: ${avgElixir.toFixed(1)}

Provide tactical analysis:
1. Strengths: 3-4 key advantages based on card synergies and roles
2. Weaknesses: 3-4 vulnerabilities or missing elements
3. Recommendations: 3-4 specific, actionable improvements

Focus on playstyle, win conditions, and defensive capabilities. Be specific.`;

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
            content: 'You are an expert Clash Royale deck builder. Provide detailed, structured analysis.' 
          },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_deck",
              description: "Analyze a Clash Royale deck and return structured scores and recommendations",
              parameters: {
                type: "object",
                properties: {
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 key strengths of the deck"
                  },
                  weaknesses: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 key weaknesses of the deck"
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 concrete improvement suggestions"
                  }
                },
                required: ["strengths", "weaknesses", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_deck" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error', { status: response.status, error: errorText });
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error('No tool call returned from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return jsonResponse({
      synergy_score: null,
      meta_score: null,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      avg_elixir: avgElixir,
    });

  } catch (error) {
    logger.error('Error in analyze-deck-builder', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
