import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deck, targetTrophies, language = 'en' } = await req.json();

    if (!deck || deck.length !== 8) {
      return new Response(
        JSON.stringify({ error: 'Deck must contain exactly 8 cards' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    const cardList = deck.join(', ');
    const prompt = `You are a Clash Royale expert analyzing deck performance across trophy ranges. ${languageInstruction}

Deck: ${cardList}
Target Trophy Range: ${targetTrophies}

Analyze this deck's expected performance at different trophy ranges around the target.
For each range, provide:
1. Predicted win rate percentage (be realistic based on deck archetypes and meta)
2. Confidence level (how sure you are about this prediction)
3. 2-3 specific tips for playing at that trophy range

Consider:
- How well this deck archetype performs against common meta decks at different levels
- Player skill expectations at different trophy ranges
- Card level requirements and their impact

Provide predictions for 3-4 trophy ranges including the target range.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are an expert Clash Royale analyst. ${languageInstruction}` },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_predictions",
            description: "Return deck performance predictions across trophy ranges",
            parameters: {
              type: "object",
              properties: {
                predictions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      trophy_range: { type: "string", description: "Trophy range (e.g., '5000-5500')" },
                      predicted_win_rate: { type: "number", description: "Expected win rate percentage" },
                      confidence: { type: "number", description: "Confidence level 0-100" },
                      tips: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Tips for playing at this range (in user's language)"
                      },
                      is_sweet_spot: { type: "boolean", description: "True if this is the optimal range for this deck" }
                    },
                    required: ["trophy_range", "predicted_win_rate", "confidence", "tips", "is_sweet_spot"]
                  }
                }
              },
              required: ["predictions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_predictions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI prediction failed');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in predict-deck-performance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});