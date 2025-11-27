import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { cards } = await req.json();
    
    if (!cards || cards.length !== 8) {
      throw new Error('Deck must contain exactly 8 cards');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const cardNames = cards.map((c: any) => c.name).join(', ');
    const avgElixir = cards.reduce((sum: number, c: any) => sum + (c.elixirCost || 0), 0) / 8;

    const prompt = `Analyze this Clash Royale deck: ${cardNames} (Average Elixir: ${avgElixir.toFixed(1)})`;

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
                  synergy_score: {
                    type: "integer",
                    description: "How well cards work together (0-100)",
                    minimum: 0,
                    maximum: 100
                  },
                  meta_score: {
                    type: "integer",
                    description: "How viable in current meta (0-100)",
                    minimum: 0,
                    maximum: 100
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 key strengths of the deck",
                    minItems: 3,
                    maxItems: 3
                  },
                  weaknesses: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 key weaknesses of the deck",
                    minItems: 3,
                    maxItems: 3
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 concrete improvement suggestions",
                    minItems: 3,
                    maxItems: 3
                  }
                },
                required: ["synergy_score", "meta_score", "strengths", "weaknesses", "recommendations"],
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
        synergy_score: analysis.synergy_score,
        meta_score: analysis.meta_score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        avg_elixir: avgElixir,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-deck-builder:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
