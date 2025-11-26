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
    const { deck, targetTrophies } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const trophyRanges = [
      { min: 3000, max: 4000, name: "3000-4000" },
      { min: 4000, max: 5000, name: "4000-5000" },
      { min: 5000, max: 6000, name: "5000-6000" },
      { min: 6000, max: 7000, name: "6000-7000" },
      { min: 7000, max: 8000, name: "7000-8000+" },
    ];

    const relevantRanges = trophyRanges.filter(
      r => Math.abs((r.min + r.max) / 2 - targetTrophies) <= 2000
    );

    const prompt = `Analyze this Clash Royale deck for performance at different trophy ranges:

Deck: ${deck.join(", ")}
Target Trophies: ${targetTrophies}

For each trophy range (${relevantRanges.map(r => r.name).join(", ")}), predict:
1. Expected win rate (45-58% realistic range)
2. Confidence level (0-100)
3. 2-3 arena-specific tips
4. Whether this is the "sweet spot" trophy range for this deck

Return predictions in order from lowest to highest trophies.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a Clash Royale deck performance analyst.' },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_predictions",
            description: "Return trophy-based win rate predictions",
            parameters: {
              type: "object",
              properties: {
                predictions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      trophy_range: { type: "string" },
                      predicted_win_rate: { type: "number" },
                      confidence: { type: "number" },
                      tips: { type: "array", items: { type: "string" } },
                      is_sweet_spot: { type: "boolean" }
                    },
                    required: ["trophy_range", "predicted_win_rate", "confidence", "tips", "is_sweet_spot"],
                    additionalProperties: false
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
    console.error('Error in predict-deck-performance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
