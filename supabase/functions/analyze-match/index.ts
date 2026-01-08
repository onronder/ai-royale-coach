import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

interface MatchAnalysisRequest {
  battle: any;
  playerTag: string;
}

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

    // RATE LIMITING
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitIdentifier = `analyze-match:${clientIP}`;
    
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
      return errorResponse('Subscription required for AI match analysis', 403, { subscription_required: true });
    }

    const { battle, playerTag, language = 'en' }: MatchAnalysisRequest & { language?: string } = await req.json();

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

    const normalizedTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
    logger.info('Analyzing match', { playerTag: normalizedTag });

    const playerTeam = battle.team.find((p: any) => p.tag === normalizedTag);
    const opponent = battle.opponent[0];
    
    if (!playerTeam || !opponent) {
      logger.error('Player not found', { lookingFor: normalizedTag, available: battle.team?.map((p: any) => p.tag) });
      throw new Error('Player or opponent not found in battle data');
    }

    const isWin = playerTeam.crowns > opponent.crowns;
    const playerCards = playerTeam.cards.map((c: any) => c.name).join(', ');
    const opponentCards = opponent.cards.map((c: any) => c.name).join(', ');

    const prompt = `Analyze this Clash Royale match and provide structured insights:

**Battle Outcome:** ${isWin ? 'Victory' : 'Defeat'}
**Final Score:** ${playerTeam.crowns} - ${opponent.crowns} crowns
**Game Mode:** ${battle.gameMode.name}

**Your Deck:** ${playerCards}
**Opponent's Deck:** ${opponentCards}

Provide your analysis in the following JSON format:
{
  "deckMatchup": "2-3 sentences about how these decks match up and key interactions",
  "analysis": "2-3 sentences about what likely happened based on outcome",
  "recommendations": ["tip 1", "tip 2", "tip 3"],
  "pivotalInteractions": [
    {
      "yourCard": "card name from your deck",
      "opponentCard": "card name from opponent deck",
      "phase": "early|mid|late|overtime",
      "description": "Brief description of this key interaction",
      "impact": "high|medium"
    }
  ],
  "counterDeck": {
    "cards": ["8 card names that counter opponent's deck well"],
    "explanations": {"CardName": "Why this card counters their deck"},
    "overallStrategy": "How to play this counter deck against their strategy"
  }
}

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
            content: `You are an expert Clash Royale coach and analyst. Provide analysis in valid JSON format only. Be practical and actionable. ${languageInstruction}` 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error', { status: response.status, error: errorText });
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const analysisText = aiData.choices[0].message.content;
    
    logger.debug('AI Response received', { length: analysisText.length });

    // Parse JSON response
    let parsedAnalysis;
    try {
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedAnalysis = JSON.parse(cleanedText);
    } catch (parseError) {
      logger.warn('JSON parse error, falling back to text parsing');
      parsedAnalysis = {
        deckMatchup: analysisText.slice(0, 300),
        analysis: analysisText,
        recommendations: [],
        pivotalInteractions: [],
        counterDeck: null,
      };
    }

    // Validate and normalize the response
    const result = {
      deckMatchup: parsedAnalysis.deckMatchup || 'Unable to analyze deck matchup.',
      analysis: parsedAnalysis.analysis || analysisText,
      recommendations: Array.isArray(parsedAnalysis.recommendations) 
        ? parsedAnalysis.recommendations.slice(0, 5) 
        : [],
      pivotalInteractions: Array.isArray(parsedAnalysis.pivotalInteractions)
        ? parsedAnalysis.pivotalInteractions.slice(0, 4).map((i: any) => ({
            yourCard: i.yourCard || 'Unknown',
            opponentCard: i.opponentCard || 'Unknown',
            phase: ['early', 'mid', 'late', 'overtime'].includes(i.phase) ? i.phase : 'mid',
            description: i.description || '',
            impact: i.impact === 'high' ? 'high' : 'medium',
          }))
        : [],
      counterDeck: parsedAnalysis.counterDeck ? {
        cards: Array.isArray(parsedAnalysis.counterDeck.cards) 
          ? parsedAnalysis.counterDeck.cards.slice(0, 8)
          : [],
        explanations: parsedAnalysis.counterDeck.explanations || {},
        overallStrategy: parsedAnalysis.counterDeck.overallStrategy || '',
      } : null,
    };

    return jsonResponse(result);

  } catch (error) {
    logger.error('Error in analyze-match', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
