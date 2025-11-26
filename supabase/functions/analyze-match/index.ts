import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchAnalysisRequest {
  battle: any;
  playerTag: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { battle, playerTag }: MatchAnalysisRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const playerTeam = battle.team.find((p: any) => p.tag === playerTag);
    const opponent = battle.opponent[0];
    
    if (!playerTeam || !opponent) {
      throw new Error('Player or opponent not found in battle data');
    }

    const isWin = playerTeam.crowns > opponent.crowns;
    const playerCards = playerTeam.cards.map((c: any) => c.name).join(', ');
    const opponentCards = opponent.cards.map((c: any) => c.name).join(', ');

    const prompt = `Analyze this Clash Royale match:

**Battle Outcome:** ${isWin ? 'Victory' : 'Defeat'}
**Final Score:** ${playerTeam.crowns} - ${opponent.crowns} crowns
**Game Mode:** ${battle.gameMode.name}

**Your Deck:** ${playerCards}
**Opponent's Deck:** ${opponentCards}

Provide a concise analysis with:
1. **Deck Matchup** (2-3 sentences): How do these decks match up? What are the key interactions?
2. **What Happened** (2-3 sentences): Based on the outcome, what likely happened in this match?
3. **Recommendations** (3 bullet points): Specific tips for ${isWin ? 'maintaining this advantage' : 'improving against this matchup'} next time.

Keep it practical and actionable.`;

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
            content: 'You are an expert Clash Royale coach. Provide clear, actionable advice based on match data.' 
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
    const sections = analysisText.split(/\*\*/).filter((s: string) => s.trim());
    
    let deckMatchup = '';
    let analysis = '';
    const recommendations: string[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.includes('Deck Matchup') && sections[i + 1]) {
        deckMatchup = sections[i + 1].replace(/^[:\s]+/, '').trim();
      } else if (section.includes('What Happened') && sections[i + 1]) {
        analysis = sections[i + 1].replace(/^[:\s]+/, '').trim();
      } else if (section.includes('Recommendations') && sections[i + 1]) {
        const recText = sections[i + 1].replace(/^[:\s]+/, '').trim();
        const bullets = recText.split('\n').filter((line: string) => line.trim().match(/^[\*\-•]/));
        recommendations.push(...bullets.map((b: string) => b.replace(/^[\*\-•]\s*/, '').trim()));
      }
    }

    return new Response(
      JSON.stringify({
        deckMatchup: deckMatchup || analysisText.slice(0, 200),
        analysis: analysis || analysisText,
        recommendations: recommendations.slice(0, 3),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-match:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
