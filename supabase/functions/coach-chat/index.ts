import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, playerTag, playerStats, recentMatches, savedDecks, cardMastery, achievements, cardCollection } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comprehensive context-aware system prompt
    let systemPrompt = `You are an expert Clash Royale AI coach with full access to the player's profile. You provide strategic advice, deck recommendations, and gameplay tips based on their complete game data.

${playerStats ? `Player Stats:
- Trophies: ${playerStats.trophies}
- Best Trophies: ${playerStats.bestTrophies}
- Arena: ${playerStats.arena}
- Win Rate: ${playerStats.winRate}%` : ''}

${recentMatches ? `Recent Performance:
- Last 10 matches: ${recentMatches.wins}W-${recentMatches.losses}L
- Average trophy change: ${recentMatches.avgTrophyChange}` : ''}

${savedDecks?.length > 0 ? `Saved Decks (${savedDecks.length} total):
${savedDecks.slice(0, 3).map((deck: any, i: number) => `${i + 1}. ${deck.name} - ${deck.win_rate ? deck.win_rate.toFixed(1) + '% WR' : 'No stats yet'}`).join('\n')}` : ''}

${cardMastery?.length > 0 ? `Top Mastered Cards (${cardMastery.length} tracked):
${cardMastery.slice(0, 5).map((card: any, i: number) => `${i + 1}. ${card.card_name} - Level ${card.mastery_level || 1}, ${card.times_used || 0} uses, ${card.battles_won || 0}W-${card.battles_lost || 0}L`).join('\n')}` : ''}

${achievements?.length > 0 ? `Achievements Unlocked: ${achievements.filter((a: any) => a.unlocked_at).length}/${achievements.length}` : ''}

${cardCollection?.length > 0 ? `Card Collection: ${cardCollection.length} cards tracked` : ''}

Guidelines:
- Be concise and actionable
- Focus on specific improvements based on their actual data
- Reference their saved decks, card mastery, and achievements
- Suggest deck improvements using cards they've mastered
- Use gaming terminology but stay professional
- Provide personalized strategies based on their playstyle`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Coach chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
