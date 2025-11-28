import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchAnalysisRequest {
  battle: any;
  playerTag: string;
}

interface PivotalInteraction {
  yourCard: string;
  opponentCard: string;
  phase: 'early' | 'mid' | 'late' | 'overtime';
  description: string;
  impact: 'high' | 'medium';
}

interface CounterDeckSuggestion {
  cards: string[];
  explanations: Record<string, string>;
  overallStrategy: string;
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

    const { battle, playerTag }: MatchAnalysisRequest = await req.json();
    
    // Normalize player tag - ensure it has # prefix for matching
    const normalizedTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
    console.log('Analyzing match for player:', normalizedTag);
    console.log('Battle team tags:', battle.team?.map((p: any) => p.tag));

    const playerTeam = battle.team.find((p: any) => p.tag === normalizedTag);
    const opponent = battle.opponent[0];
    
    if (!playerTeam || !opponent) {
      console.error('Player not found. Looking for:', normalizedTag);
      console.error('Available tags in team:', battle.team?.map((p: any) => p.tag));
      throw new Error('Player or opponent not found in battle data');
    }

    const isWin = playerTeam.crowns > opponent.crowns;
    const playerCards = playerTeam.cards.map((c: any) => c.name).join(', ');
    const opponentCards = opponent.cards.map((c: any) => c.name).join(', ');
    const playerCardsList = playerTeam.cards.map((c: any) => c.name);
    const opponentCardsList = opponent.cards.map((c: any) => c.name);

    const prompt = `Analyze this Clash Royale match and provide structured insights:

**Battle Outcome:** ${isWin ? 'Victory' : 'Defeat'}
**Final Score:** ${playerTeam.crowns} - ${opponent.crowns} crowns
**Game Mode:** ${battle.gameMode.name}

**Your Deck:** ${playerCards}
**Opponent's Deck:** ${opponentCards}

Provide your analysis in the following JSON format:
{
  "deckMatchup": "2-3 sentences about how these decks match up and key interactions",
  "analysis": "2-3 sentences about what likely happened based on outcome",
  "recommendations": ["tip 1", "tip 2", "tip 3"],
  "pivotalInteractions": [
    {
      "yourCard": "card name from your deck",
      "opponentCard": "card name from opponent deck",
      "phase": "early|mid|late|overtime",
      "description": "Brief description of this key interaction",
      "impact": "high|medium"
    }
  ],
  "counterDeck": {
    "cards": ["8 card names that counter opponent's deck well"],
    "explanations": {"CardName": "Why this card counters their deck"},
    "overallStrategy": "How to play this counter deck against their strategy"
  }
}

For pivotalInteractions: identify 3-4 key card matchups that likely decided or influenced the game.
For counterDeck: suggest 8 cards that would effectively counter the opponent's deck composition.

Return ONLY valid JSON, no markdown or extra text.`;

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
            content: 'You are an expert Clash Royale coach and analyst. Provide analysis in valid JSON format only. Be practical and actionable.' 
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
    
    console.log('AI Response:', analysisText);

    // Parse JSON response
    let parsedAnalysis;
    try {
      // Clean up potential markdown code blocks
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedAnalysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error, falling back to text parsing:', parseError);
      // Fallback to simple text extraction
      parsedAnalysis = {
        deckMatchup: analysisText.slice(0, 300),
        analysis: analysisText,
        recommendations: [],
        pivotalInteractions: [],
        counterDeck: null,
      };
    }

    // Validate and normalize the response
    const result = {
      deckMatchup: parsedAnalysis.deckMatchup || 'Unable to analyze deck matchup.',
      analysis: parsedAnalysis.analysis || analysisText,
      recommendations: Array.isArray(parsedAnalysis.recommendations) 
        ? parsedAnalysis.recommendations.slice(0, 5) 
        : [],
      pivotalInteractions: Array.isArray(parsedAnalysis.pivotalInteractions)
        ? parsedAnalysis.pivotalInteractions.slice(0, 4).map((i: any) => ({
            yourCard: i.yourCard || 'Unknown',
            opponentCard: i.opponentCard || 'Unknown',
            phase: ['early', 'mid', 'late', 'overtime'].includes(i.phase) ? i.phase : 'mid',
            description: i.description || '',
            impact: i.impact === 'high' ? 'high' : 'medium',
          }))
        : [],
      counterDeck: parsedAnalysis.counterDeck ? {
        cards: Array.isArray(parsedAnalysis.counterDeck.cards) 
          ? parsedAnalysis.counterDeck.cards.slice(0, 8)
          : [],
        explanations: parsedAnalysis.counterDeck.explanations || {},
        overallStrategy: parsedAnalysis.counterDeck.overallStrategy || '',
      } : null,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-match:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
