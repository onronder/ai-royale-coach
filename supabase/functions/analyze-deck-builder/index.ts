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

    const prompt = `Analyze this Clash Royale deck:

**Cards:** ${cardNames}
**Average Elixir:** ${avgElixir.toFixed(1)}

Provide a comprehensive analysis with:

1. **Synergy Score** (0-100): How well the cards work together
2. **Meta Score** (0-100): How viable is this deck in the current meta
3. **3 Strengths**: What this deck does well
4. **3 Weaknesses**: What this deck struggles against
5. **3 Recommendations**: Specific card swaps or strategy adjustments

Format your response exactly like this:
SYNERGY_SCORE: <number>
META_SCORE: <number>
STRENGTHS:
- <strength 1>
- <strength 2>
- <strength 3>
WEAKNESSES:
- <weakness 1>
- <weakness 2>
- <weakness 3>
RECOMMENDATIONS:
- <recommendation 1>
- <recommendation 2>
- <recommendation 3>`;

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
            content: 'You are an expert Clash Royale deck builder and strategist. Provide detailed, actionable analysis.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const analysisText = aiData.choices[0].message.content;

    // Parse the structured response
    const lines = analysisText.split('\n');
    let synergy_score = 75;
    let meta_score = 70;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    let currentSection = '';
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('SYNERGY_SCORE:')) {
        synergy_score = parseInt(trimmed.split(':')[1].trim()) || 75;
      } else if (trimmed.startsWith('META_SCORE:')) {
        meta_score = parseInt(trimmed.split(':')[1].trim()) || 70;
      } else if (trimmed === 'STRENGTHS:') {
        currentSection = 'strengths';
      } else if (trimmed === 'WEAKNESSES:') {
        currentSection = 'weaknesses';
      } else if (trimmed === 'RECOMMENDATIONS:') {
        currentSection = 'recommendations';
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const text = trimmed.replace(/^[-•]\s*/, '').trim();
        if (text) {
          if (currentSection === 'strengths') strengths.push(text);
          else if (currentSection === 'weaknesses') weaknesses.push(text);
          else if (currentSection === 'recommendations') recommendations.push(text);
        }
      }
    }

    return new Response(
      JSON.stringify({
        synergy_score,
        meta_score,
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        recommendations: recommendations.slice(0, 3),
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
