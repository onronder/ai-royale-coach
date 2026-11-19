import { classifyDeck, evidenceKey, evidenceHash } from '../_shared/deck-evidence.ts';
import { observeBattles } from '../_shared/battle-observation.ts';
import { createMeasuredAIFetch } from '../_shared/ai-generation.ts';
import { productLanguage } from "../_shared/language.ts";
import { recordTrialUsage } from '../_shared/trial-usage.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";
import { logger } from "../_shared/logger.ts";
import { analysisErrorResponse } from "../_shared/analysis-error.ts";

interface DeckAnalysisRequest {
  playerData: any;
  battles: any[];
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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
      logger.error('Rate limit check error', { error: rateLimitError.message });
    } else if (!rateLimitAllowed) {
      return errorResponse('Too many requests. Please slow down.', 429);
    }

    // SECURITY FIX: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized - missing authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return errorResponse('Unauthorized - invalid token', 401);
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
    const aiAccess = await checkAiAccess(supabase, user.id);
    const hasAccess = aiAccess.allowed;

    if (!hasAccess) {
      return errorResponse('Subscription required to use AI features', 403, { subscription_required: true });
    }

    const { playerData, battles, language: requestedLanguage }: DeckAnalysisRequest & { language?: string } = await req.json();
    const language = productLanguage(requestedLanguage);

    // Helper to normalize player tags (database stores without #)
    const normalizePlayerTag = (tag: string): string => {
      return tag.replace(/^#/, '').toUpperCase();
    };

    // PER-PLAYER AI ACCESS CHECK (bypassed for trial users - all accounts get AI during trial)
    if (playerData?.tag && !aiAccess.isTrial && !aiAccess.isAdmin) {
      const playerTag = normalizePlayerTag(playerData.tag);
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('ai_enabled')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .single();

      if (!playerProfile?.ai_enabled) {
        return errorResponse('AI not enabled for this account', 403, {
          ai_not_enabled: true,
          player_tag: playerData.tag
        });
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

    const detectedArchetype = classifyDeck(deckCards, archetypes) || { name: 'Custom / mixed', playstyle: 'Not classified', description: 'No verified archetype match', tips: [] };
    const observed = observeBattles(battles, playerData.tag);
    const groups = new Map<string, { wins: number; losses: number; draws: number; total: number }>();
    for (const b of observed.battles) {
      if (b.format !== '1v1') continue;
      const name = classifyDeck(b.opponents[0].cards.map(c => c.name), archetypes)?.name || 'Custom / mixed';
      const key = `${b.mode} / ${name}`;
      const stats = groups.get(key) || { wins: 0, losses: 0, draws: 0, total: 0 };
      stats.total++;
      if (b.outcome === 'win') stats.wins++; else if (b.outcome === 'loss') stats.losses++; else stats.draws++;
      groups.set(key, stats);
    }
    const archetypeWinRates = [...groups].map(([archetype, stats]) => ({ archetype, ...stats, winRate: stats.wins / stats.total * 100 }));

    // Get AI recommendations using structured tool calling
    const prompt = `Analyze this Clash Royale deck:

**Archetype:** ${detectedArchetype.name} (${detectedArchetype.playstyle})
**Current Deck:** ${deckCards.join(', ')}
**Win Rate Data:** ${archetypeWinRates.map(a => `${a.archetype}: ${a.winRate.toFixed(0)}% (${a.wins}W-${a.losses}L-${a.draws}D n=${a.total})`).join(', ')}

Based on the detected archetype and performance data, analyze:
1. 3 key strengths of this deck
2. 3 weaknesses or vulnerability areas  
3. 3 specific recommendations for improvement

Be specific about card interactions and matchups. Each point should be 1-2 sentences.
${languageInstruction}`;

    const response = await createMeasuredAIFetch({ db: supabase, userId: user.id, tier: aiAccess.isAdmin ? 'admin' : aiAccess.isTrial ? 'trial' : 'paid', feature: 'analyze-deck' })('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (response.status === 409) return analysisErrorResponse(409, await response.text());
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error', { status: response.status, error: errorText });
      return analysisErrorResponse(response.status, errorText);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error('No tool call returned from AI');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    if (aiAccess.isTrial && response.headers.get('X-AI-Response-Replayed') !== 'true') await recordTrialUsage(supabase, user.id, 'analyze-deck');
    return jsonResponse({
      archetype: {
        name: detectedArchetype.name,
        playstyle: detectedArchetype.playstyle,
        tips: analysis.archetype_tips || detectedArchetype.tips,
      },
      archetypeWinRates,
      strengths: analysis.strengths.slice(0, 3),
      weaknesses: analysis.weaknesses.slice(0, 3),
      recommendations: analysis.recommendations.slice(0, 3),
    });

  } catch (error) {
    logger.error('Error in analyze-deck', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
