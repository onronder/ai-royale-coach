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
      return errorResponse('Subscription required for AI tips', 403, { subscription_required: true });
    }

    const { cardName, winRate, timesUsed, bestPartners, worstMatchups, playerTag, language = 'en' } = await req.json();

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
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    const prompt = `You are a Clash Royale coach providing personalized card mastery tips. ${languageInstruction}

Card: ${cardName}
Times Used: ${timesUsed}
Win Rate: ${(winRate * 100).toFixed(1)}%
Best Partner Cards: ${bestPartners?.join(', ') || 'None yet'}
Struggles Against: ${worstMatchups?.join(', ') || 'None identified'}

Generate 2-3 concise, actionable tips (each 1-2 sentences) to help the player improve with this card. Focus on:
- Placement timing and positioning
- Synergies with partner cards
- Countering difficult matchups
- Advanced techniques or combos

Keep tips practical and specific to this card's performance data.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are a helpful Clash Royale coach providing concise, actionable advice. ${languageInstruction}` },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error', { status: response.status, error: errorText });
      throw new Error('Failed to generate tips');
    }

    const data = await response.json();
    const tips = data.choices[0].message.content;

    return jsonResponse({ tips });

  } catch (error) {
    logger.error('Error in generate-card-tips', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
