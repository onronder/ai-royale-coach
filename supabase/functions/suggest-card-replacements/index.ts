import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
        JSON.stringify({ error: 'Subscription required for AI suggestions', subscription_required: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { currentDeck, targetCard, availableCards, playerTag, language = 'en' } = await req.json();

    // PER-PLAYER AI ACCESS CHECK (bypassed for trial users - all accounts get AI during trial)
    if (playerTag && !isTrialActive) {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Language instruction based on user preference
    const languageInstructions: Record<string, string> = {
      en: 'Respond in English. All reasoning text must be in English.',
      es: 'Responde en español. Todo el texto de razonamiento debe estar en español.',
      pt: 'Responda em português. Todo o texto de razonamiento deve estar em português.',
      tr: 'Türkçe yanıt ver. Tüm gerekçe metni Türkçe olmalıdır.',
      fr: 'Réponds en français. Tout le texte de raisonnement doit être en français.',
    };
    const languageInstruction = languageInstructions[language] || languageInstructions.en;

    const prompt = `You are a Clash Royale deck building expert. ${languageInstruction}

Current Deck: ${currentDeck.join(", ")}
Card to Replace: ${targetCard}
${availableCards ? `Available Cards: ${availableCards.join(", ")}` : "Consider all cards"}

Suggest 3-5 replacement cards that:
1. Maintain or improve deck synergy
2. Fill similar roles to the removed card
3. Are available in the user's collection (if provided)
4. Consider meta viability

For each suggestion, provide:
- Card name (keep original English card name)
- Synergy impact (-10 to +10)
- Meta impact (-10 to +10)
- Reasoning in ${language === 'en' ? 'English' : language === 'es' ? 'Spanish' : language === 'pt' ? 'Portuguese' : language === 'tr' ? 'Turkish' : 'French'} (1-2 sentences)
- Elixir cost

Focus on practical, viable replacements that improve the deck.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are a Clash Royale deck building expert. ${languageInstruction}` },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_suggestions",
            description: "Return card replacement suggestions with reasoning in user's language",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      card: { type: "string", description: "Card name (keep English name)" },
                      synergy_impact: { type: "number" },
                      meta_impact: { type: "number" },
                      reasoning: { type: "string", description: "Reasoning in user's language" },
                      elixir_cost: { type: "number" }
                    },
                    required: ["card", "synergy_impact", "meta_impact", "reasoning", "elixir_cost"],
                    additionalProperties: false
                  }
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_suggestions" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in suggest-card-replacements:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
