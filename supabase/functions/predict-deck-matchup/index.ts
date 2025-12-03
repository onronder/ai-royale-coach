import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchupPredictionRequest {
  deckA: string[];
  deckB: string[];
  playerTag?: string;
  language?: string;
}

interface KeyMatchup {
  deckACard: string;
  deckBCard: string;
  advantage: 'deckA' | 'deckB' | 'even';
  reason: string;
}

interface MatchupPredictionResult {
  deckAWinRate: number;
  deckBWinRate: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  keyMatchups: KeyMatchup[];
  tips: {
    forDeckA: string[];
    forDeckB: string[];
  };
  fromCache?: boolean;
}

// Generate consistent deck hash for caching
function generateDeckHash(deckA: string[], deckB: string[]): string {
  const sortedDeckA = [...deckA].sort().join('|');
  const sortedDeckB = [...deckB].sort().join('|');
  const [first, second] = [sortedDeckA, sortedDeckB].sort();
  return `${first}::${second}`;
}

const CACHE_DURATION_DAYS = 7;

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

    // Validate authentication
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

    const { deckA, deckB, playerTag, language = 'en' }: MatchupPredictionRequest = await req.json();

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

    // Validate decks
    if (!deckA || !deckB || deckA.length !== 8 || deckB.length !== 8) {
      return new Response(
        JSON.stringify({ error: 'Both decks must contain exactly 8 cards' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate deck hash for caching
    const deckHash = generateDeckHash(deckA, deckB);
    console.log('Deck hash for caching:', deckHash);

    // Check cache for existing prediction
    const cacheExpiry = new Date();
    cacheExpiry.setDate(cacheExpiry.getDate() - CACHE_DURATION_DAYS);

    const { data: cachedPrediction } = await supabase
      .from('matchup_predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('deck_hash', deckHash)
      .eq('language', language)
      .gte('created_at', cacheExpiry.toISOString())
      .single();

    if (cachedPrediction) {
      console.log('Returning cached prediction');
      const result: MatchupPredictionResult = {
        deckAWinRate: cachedPrediction.predicted_win_rate_a,
        deckBWinRate: cachedPrediction.predicted_win_rate_b,
        confidence: cachedPrediction.confidence,
        explanation: cachedPrediction.explanation || '',
        keyMatchups: cachedPrediction.key_matchups || [],
        tips: cachedPrediction.tips || { forDeckA: [], forDeckB: [] },
        fromCache: true,
      };
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No cache found, generating new prediction');

    // Language instruction based on user preference
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
            content: `You are an expert Clash Royale analyst specializing in deck matchups. Provide accurate win rate predictions based on card interactions, meta knowledge, and strategic analysis. ${languageInstruction}` 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI quota exceeded. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const analysisText = aiData.choices[0].message.content;
    
    console.log('AI Response:', analysisText);

    // Parse JSON response
    let parsedAnalysis: MatchupPredictionResult;
    try {
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedAnalysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedAnalysis = {
        deckAWinRate: 50,
        deckBWinRate: 50,
        confidence: 'low',
        explanation: 'Unable to parse detailed analysis. These decks appear evenly matched.',
        keyMatchups: [],
        tips: { forDeckA: [], forDeckB: [] },
      };
    }

    // Validate and normalize the response
    const result: MatchupPredictionResult = {
      deckAWinRate: Math.max(0, Math.min(100, parsedAnalysis.deckAWinRate || 50)),
      deckBWinRate: Math.max(0, Math.min(100, parsedAnalysis.deckBWinRate || 50)),
      confidence: ['high', 'medium', 'low'].includes(parsedAnalysis.confidence) 
        ? parsedAnalysis.confidence 
        : 'medium',
      explanation: parsedAnalysis.explanation || 'Analysis unavailable.',
      keyMatchups: Array.isArray(parsedAnalysis.keyMatchups)
        ? parsedAnalysis.keyMatchups.slice(0, 4).map((m: any) => ({
            deckACard: m.deckACard || 'Unknown',
            deckBCard: m.deckBCard || 'Unknown',
            advantage: ['deckA', 'deckB', 'even'].includes(m.advantage) ? m.advantage : 'even',
            reason: m.reason || '',
          }))
        : [],
      tips: {
        forDeckA: Array.isArray(parsedAnalysis.tips?.forDeckA) 
          ? parsedAnalysis.tips.forDeckA.slice(0, 3) 
          : [],
        forDeckB: Array.isArray(parsedAnalysis.tips?.forDeckB) 
          ? parsedAnalysis.tips.forDeckB.slice(0, 3) 
          : [],
      },
      fromCache: false,
    };

    // Ensure win rates sum to 100
    const total = result.deckAWinRate + result.deckBWinRate;
    if (total !== 100) {
      result.deckAWinRate = Math.round((result.deckAWinRate / total) * 100);
      result.deckBWinRate = 100 - result.deckAWinRate;
    }

    // Store prediction in cache
    const normalizedPlayerTag = playerTag ? (playerTag.startsWith('#') ? playerTag : `#${playerTag}`) : '';
    
    await supabase
      .from('matchup_predictions')
      .upsert({
        user_id: user.id,
        player_tag: normalizedPlayerTag,
        deck_a_cards: deckA,
        deck_b_cards: deckB,
        deck_hash: deckHash,
        predicted_win_rate_a: result.deckAWinRate,
        predicted_win_rate_b: result.deckBWinRate,
        confidence: result.confidence,
        explanation: result.explanation,
        key_matchups: result.keyMatchups,
        tips: result.tips,
        language: language,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,deck_hash,language',
      });

    console.log('Prediction cached successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in predict-deck-matchup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});