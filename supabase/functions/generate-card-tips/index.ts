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
    const { cardName, winRate, timesUsed, bestPartners, worstMatchups } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are a Clash Royale coach providing personalized card mastery tips.

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
          { role: 'system', content: 'You are a helpful Clash Royale coach providing concise, actionable advice.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Failed to generate tips');
    }

    const data = await response.json();
    const tips = data.choices[0].message.content;

    return new Response(JSON.stringify({ tips }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-card-tips:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});