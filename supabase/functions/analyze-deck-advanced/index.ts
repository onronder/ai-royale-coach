import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Card {
  id: number;
  name: string;
  elixirCost: number;
  rarity: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cards } = await req.json();

    if (!cards || cards.length !== 8) {
      return new Response(
        JSON.stringify({ error: 'Exactly 8 cards required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Calculate basic stats
    const totalElixir = cards.reduce((sum: number, c: Card) => sum + c.elixirCost, 0);
    const avgElixir = totalElixir / 8;
    
    const elixirDistribution = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(cost => ({
      cost,
      count: cards.filter((c: Card) => c.elixirCost === cost).length
    }));

    const cardList = cards.map((c: Card) => `${c.name} (${c.elixirCost} elixir, ${c.rarity})`).join(', ');

    const prompt = `You are an expert Clash Royale deck analyst. Analyze this deck for advanced statistics:

Deck: ${cardList}
Average Elixir: ${avgElixir.toFixed(1)}

Provide comprehensive analysis covering:

1. ELIXIR ANALYSIS:
- Classify cycle speed (fast: <3.0, medium: 3.0-3.5, slow: >3.5)
- Calculate defensive elixir cost (sum of defensive cards)
- Calculate offensive elixir cost (sum of offensive cards)
- Identify 5 common elixir trade scenarios with specific cards and gains/losses

2. SYNERGY MATRIX:
- Analyze synergies between all 28 card pairs (8 cards = 28 combinations)
- Rate each synergy 1-5 stars based on:
  * Tank + Support combinations
  * Spell synergies with troops
  * Cycle card efficiency together
  * Win condition enablers
- Identify top 3 strongest synergies
- Identify any anti-synergies (competing win conditions, redundant roles)
- Calculate overall synergy score (0-100)

3. MATCHUP PREDICTIONS:
- Predict matchups against 6 meta archetypes: Golem Beatdown, Hog 2.6 Cycle, X-Bow Siege, Logbait, Graveyard Control, Lava Hound
- For each matchup provide:
  * Prediction: favorable/even/unfavorable
  * Confidence percentage (0-100) based on card matchups
  * 2-3 key enemy cards this deck handles well/poorly
  * 1 sentence strategy tip

Respond with structured data only.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_deck_advanced',
            description: 'Return advanced deck statistics',
            parameters: {
              type: 'object',
              properties: {
                elixirAnalysis: {
                  type: 'object',
                  properties: {
                    cycleSpeed: { type: 'string', enum: ['fast', 'medium', 'slow'] },
                    defensiveCost: { type: 'number' },
                    offensiveCost: { type: 'number' },
                    tradeScenarios: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          yourCard: { type: 'string' },
                          yourCost: { type: 'number' },
                          enemyCard: { type: 'string' },
                          enemyCost: { type: 'number' },
                          tradeValue: { type: 'number' },
                          description: { type: 'string' }
                        },
                        required: ['yourCard', 'yourCost', 'enemyCard', 'enemyCost', 'tradeValue', 'description']
                      }
                    }
                  },
                  required: ['cycleSpeed', 'defensiveCost', 'offensiveCost', 'tradeScenarios']
                },
                synergyMatrix: {
                  type: 'object',
                  properties: {
                    pairs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          card1: { type: 'string' },
                          card2: { type: 'string' },
                          rating: { type: 'number', minimum: 1, maximum: 5 },
                          explanation: { type: 'string' }
                        },
                        required: ['card1', 'card2', 'rating', 'explanation']
                      }
                    },
                    overallScore: { type: 'number', minimum: 0, maximum: 100 },
                    topSynergies: { type: 'array', items: { type: 'string' } },
                    antiSynergies: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['pairs', 'overallScore', 'topSynergies', 'antiSynergies']
                },
                matchupPredictions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      archetype: { type: 'string' },
                      prediction: { type: 'string', enum: ['favorable', 'even', 'unfavorable'] },
                      confidence: { type: 'number', minimum: 0, maximum: 100 },
                      keyCards: { type: 'array', items: { type: 'string' } },
                      strategy: { type: 'string' }
                    },
                    required: ['archetype', 'prediction', 'confidence', 'keyCards', 'strategy']
                  }
                }
              },
              required: ['elixirAnalysis', 'synergyMatrix', 'matchupPredictions'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_deck_advanced' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const result = await aiResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const analysisData = JSON.parse(toolCall.function.arguments);

    // Add calculated fields
    analysisData.elixirAnalysis.avgElixir = avgElixir;
    analysisData.elixirAnalysis.elixirDistribution = elixirDistribution;

    return new Response(JSON.stringify(analysisData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-deck-advanced:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
