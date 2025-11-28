import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeckAnalysisRequest {
  playerData: any;
  battles: any[];
}

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

    // SECURITY FIX: Validate authentication
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

    const { playerData, battles }: DeckAnalysisRequest = await req.json();

    // Fetch all archetypes
    const { data: archetypes, error: archetypesError } = await supabase
      .from('deck_archetypes')
      .select('*');

    if (archetypesError) throw archetypesError;

    const currentDeck = playerData.currentDeck || [];
    const deckCards = currentDeck.map((c: any) => c.name);

    // Detect player's archetype
    let detectedArchetype = archetypes[0]; // default
    let maxMatches = 0;

    for (const archetype of archetypes) {
      const matches = archetype.key_cards.filter((card: string) => 
        deckCards.some((deckCard: string) => deckCard.toLowerCase().includes(card.toLowerCase()))
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedArchetype = archetype;
      }
    }

    // Analyze win rates vs different archetypes
    const archetypeStats = new Map<string, { wins: number; losses: number }>();

    for (const battle of battles.slice(0, 25)) {
      const playerTeam = battle.team.find((p: any) => p.tag === playerData.tag);
      const opponent = battle.opponent[0];
      
      if (!playerTeam || !opponent) continue;

      const isWin = playerTeam.crowns > opponent.crowns;
      const opponentCards = opponent.cards.map((c: any) => c.name);

      // Detect opponent archetype
      let opponentArchetype = 'Unknown';
      let maxOpponentMatches = 0;

      for (const archetype of archetypes) {
        const matches = archetype.key_cards.filter((card: string) =>
          opponentCards.some((opCard: string) => opCard.toLowerCase().includes(card.toLowerCase()))
        ).length;

        if (matches > maxOpponentMatches) {
          maxOpponentMatches = matches;
          opponentArchetype = archetype.name;
        }
      }

      const stats = archetypeStats.get(opponentArchetype) || { wins: 0, losses: 0 };
      if (isWin) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      archetypeStats.set(opponentArchetype, stats);
    }

    const archetypeWinRates = Array.from(archetypeStats.entries())
      .map(([archetype, stats]) => ({
        archetype,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.wins + stats.losses > 0 
          ? (stats.wins / (stats.wins + stats.losses)) * 100 
          : 0
      }))
      .filter(a => a.wins + a.losses >= 2)
      .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));

    // Get AI recommendations
    const prompt = `Analyze this Clash Royale deck:

**Archetype:** ${detectedArchetype.name} (${detectedArchetype.playstyle})
**Current Deck:** ${deckCards.join(', ')}
**Win Rate Data:** ${archetypeWinRates.map(a => `${a.archetype}: ${a.winRate.toFixed(0)}% (${a.wins}W-${a.losses}L)`).join(', ')}

Based on the detected archetype and performance:
1. List 3 **strengths** of this deck (bullet points)
2. List 3 **weaknesses** or vulnerability areas (bullet points)
3. Provide 3 **specific recommendations** for improvement (bullet points)

Keep each point to 1 sentence. Be specific about card interactions and matchups.`;

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
            content: 'You are an expert Clash Royale deck builder and strategist. Provide clear, actionable deck analysis.' 
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

    // Parse structured response
    const lines = analysisText.split('\n').filter((l: string) => l.trim());
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    let currentSection = '';
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('strength')) {
        currentSection = 'strengths';
      } else if (lower.includes('weakness') || lower.includes('vulnerabilit')) {
        currentSection = 'weaknesses';
      } else if (lower.includes('recommendation')) {
        currentSection = 'recommendations';
      } else if (line.match(/^[\*\-•]/)) {
        const text = line.replace(/^[\*\-•]\s*/, '').trim();
        if (currentSection === 'strengths') strengths.push(text);
        else if (currentSection === 'weaknesses') weaknesses.push(text);
        else if (currentSection === 'recommendations') recommendations.push(text);
      }
    }

    return new Response(
      JSON.stringify({
        archetype: {
          name: detectedArchetype.name,
          playstyle: detectedArchetype.playstyle,
          tips: detectedArchetype.tips,
        },
        archetypeWinRates,
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        recommendations: recommendations.slice(0, 3),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-deck:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
