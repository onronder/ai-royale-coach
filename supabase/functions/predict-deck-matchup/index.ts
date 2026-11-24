import { requirePaidPlayerSlot } from '../_shared/paid-player-slot.ts';
import { DECK_RULE_VERSION, evidenceHash } from '../_shared/deck-evidence.ts';
import { parseMatchupPrediction, type MatchupPredictionResult } from '../_shared/matchup-prediction.ts';
import { analysisErrorResponse } from '../_shared/analysis-error.ts';
import { createMeasuredAIFetch } from '../_shared/ai-generation.ts';
import { productLanguage } from "../_shared/language.ts";
import { recordTrialUsage } from '../_shared/trial-usage.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";
import { logger } from "../_shared/logger.ts";

interface MatchupPredictionRequest {
  deckA: string[];
  deckB: string[];
  playerTag?: string;
  language?: string;
}

// Generate consistent deck hash for caching
function generateDeckHash(deckA: string[], deckB: string[]): string {
  const sortedDeckA = [...deckA].sort().join('|');
  const sortedDeckB = [...deckB].sort().join('|');
  // Leave old rows intact, but don't reuse their fallback/zero-corrupted percentages.
  // The provider request is unchanged, so its durable raw response can still replay.
  return `${DECK_RULE_VERSION}:matchup-result-v2:${sortedDeckA}::${sortedDeckB}`;
}

const CACHE_DURATION_DAYS = 7;

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    const { deckA, deckB, playerTag, language: requestedLanguage }: MatchupPredictionRequest = await req.json();
    const language = productLanguage(requestedLanguage);

    // Helper to normalize player tags
    const normalizePlayerTag = (tag: string): string => {
      return tag.replace(/^#/, '').toUpperCase();
    };

    const slotError = await requirePaidPlayerSlot(supabase, user.id, aiAccess, playerTag);
    if (slotError) return slotError;

    // Validate decks
    if (!deckA || !deckB || deckA.length !== 8 || deckB.length !== 8) {
      return errorResponse('Both decks must contain exactly 8 cards', 400);
    }

    // Generate deck hash for caching
    const deckHash = await evidenceHash(generateDeckHash(deckA, deckB));
    logger.debug('Deck hash for caching', { deckHash });

    // Check cache for existing prediction
    const cacheExpiry = new Date();
    cacheExpiry.setDate(cacheExpiry.getDate() - CACHE_DURATION_DAYS);

    const { data: cachedPrediction, error: cacheError } = await supabase
      .from('matchup_predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('input_fingerprint', deckHash)
      .eq('player_tag', playerTag ? `#${normalizePlayerTag(playerTag)}` : '')
      .eq('observation_mode', '1v1:PvP:Ladder')
      .eq('language', language)
      .gte('created_at', cacheExpiry.toISOString())
      .order('created_at', {ascending:false}).limit(1).maybeSingle();

    if (cacheError) {
      logger.error('Prediction cache lookup failed', { code: cacheError.code });
      return errorResponse('Unable to load the saved prediction.', 503, { type: 'matchup_prediction_load_failed' });
    }

    if (cachedPrediction) {
      logger.info('Returning cached prediction');
      try {
        const result = parseMatchupPrediction({
          deckAWinRate: cachedPrediction.predicted_win_rate_a,
          deckBWinRate: cachedPrediction.predicted_win_rate_b,
          confidence: cachedPrediction.confidence,
          explanation: cachedPrediction.explanation,
          keyMatchups: cachedPrediction.key_matchups,
          tips: cachedPrediction.tips,
        });
        return jsonResponse({ ...result, fromCache: true });
      } catch {
        return errorResponse('The saved prediction is invalid.', 502, { type: 'invalid_matchup_prediction' });
      }
    }

    logger.info('No cache found, generating new prediction');

    // Language instruction
    const languageInstructions: Record<string, string> = {
      en: 'Respond in English.',
      es: 'Responde en español.',
      pt: 'Responda em português.',
      tr: 'Türkçe yanıt ver.',
      fr: 'Réponds en français.',
    };
    const languageInstruction = languageInstructions[language] || languageInstructions.en;

    const prompt = `Analyze a head-to-head matchup between two Clash Royale decks and predict win rates.

**Deck A:** ${deckA.join(', ')}
**Deck B:** ${deckB.join(', ')}

Analyze this matchup considering:
1. Win conditions and how they interact
2. Defensive capabilities against each other's threats
3. Spell matchups and value potential
4. Cycle speed and elixir efficiency
5. Typical card interactions

Provide your analysis in the following JSON format:
{
  "deckAWinRate": <number 0-100>,
  "deckBWinRate": <number 0-100>,
  "confidence": "high" | "medium" | "low",
  "explanation": "<2-3 sentences explaining why one deck has an advantage>",
  "keyMatchups": [
    {
      "deckACard": "<card from Deck A>",
      "deckBCard": "<card from Deck B>",
      "advantage": "deckA" | "deckB" | "even",
      "reason": "<brief explanation>"
    }
  ],
  "tips": {
    "forDeckA": ["<tip 1>", "<tip 2>", "<tip 3>"],
    "forDeckB": ["<tip 1>", "<tip 2>", "<tip 3>"]
  }
}

Rules:
- Win rates must sum to 100
- Include 3-4 key card matchups that define the battle
- Tips should be specific and actionable
- Confidence should be "high" for clear matchups, "medium" for moderate advantages, "low" for close/even matchups

Return ONLY valid JSON, no markdown or extra text.`;

    const response = await createMeasuredAIFetch({ db: supabase, userId: user.id, tier: aiAccess.isAdmin ? 'admin' : aiAccess.isTrial ? 'trial' : 'paid', feature: 'predict-deck-matchup' })('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a Clash Royale deck analyst. Provide heuristic matchup estimates based on the supplied cards. These are uncalibrated model estimates, not measured win probabilities. Do not claim replay observations, verified active forms or known opponent behaviour. ${languageInstruction}`
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (response.status === 409) return analysisErrorResponse(409, await response.text());
    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('Rate limit exceeded. Please try again later.', 429);
      }
      if (response.status === 402) {
        return errorResponse('AI quota exceeded. Please add credits.', 402);
      }
      const errorText = await response.text();
      logger.error('Lovable AI error', { status: response.status, error: errorText });
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const analysisText = aiData?.choices?.[0]?.message?.content;
    
    logger.debug('AI Response received');

    // Parse JSON response
    let result: MatchupPredictionResult;
    try {
      if (typeof analysisText !== 'string') throw new Error('Missing prediction content');
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = { ...parseMatchupPrediction(JSON.parse(cleanedText)), fromCache: false };
    } catch {
      logger.warn('Invalid AI matchup prediction');
      return errorResponse('Unable to validate the matchup analysis.', 502, { type: 'invalid_matchup_prediction' });
    }

    // Store prediction in cache
    const normalizedPlayerTag = playerTag ? `#${normalizePlayerTag(playerTag)}` : '';
    
    const { error: saveError } = await supabase
      .from('matchup_predictions')
      .insert({
        user_id: user.id,
        player_tag: normalizedPlayerTag,
        deck_a_cards: deckA,
        deck_b_cards: deckB,
        deck_hash: `${deckHash}:${crypto.randomUUID()}`,
        input_fingerprint: deckHash,
        observation_mode: '1v1:PvP:Ladder',
        predicted_win_rate_a: result.deckAWinRate,
        predicted_win_rate_b: result.deckBWinRate,
        confidence: result.confidence,
        explanation: result.explanation,
        key_matchups: result.keyMatchups,
        tips: result.tips,
        language: language,
        created_at: new Date().toISOString(),
      });

    if (saveError) {
      logger.error('Prediction could not be saved', { code: saveError.code });
      return errorResponse('The prediction could not be saved for result tracking.', 503, { type: 'matchup_prediction_save_failed' });
    }

    logger.info('Prediction cached successfully');

    if (aiAccess.isTrial && response.headers.get('X-AI-Response-Replayed') !== 'true') await recordTrialUsage(supabase, user.id, 'predict-deck-matchup');
    return jsonResponse(result);

  } catch (error) {
    logger.error('Error in predict-deck-matchup', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
