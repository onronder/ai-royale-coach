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
    const { playerTag } = await req.json();
    
    if (!playerTag) {
      return new Response(JSON.stringify({ error: 'Player tag required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch player's battle log from API
    const { data: battles, error: battleError } = await supabase.functions.invoke('clash-royale-api', {
      body: { endpoint: `players/${encodeURIComponent(playerTag)}/battlelog` }
    });

    if (battleError || !battles) {
      throw new Error('Failed to fetch battle log');
    }

    // Calculate real statistics from actual battles
    let totalBattles = 0;
    let wins = 0;
    let losses = 0;
    let totalCrowns = 0;
    let totalTrophyChange = 0;
    
    const deckPerformance = new Map<string, { 
      wins: number; 
      losses: number; 
      battles: number;
      cards: string[];
    }>();

    for (const battle of battles) {
      if (!battle.team || !battle.team[0]) continue;
      
      const myTeam = battle.team[0];
      const opponent = battle.opponent?.[0];
      
      if (!opponent) continue;

      totalBattles++;
      
      const myCrowns = myTeam.crowns || 0;
      const opponentCrowns = opponent.crowns || 0;
      
      if (myCrowns > opponentCrowns) {
        wins++;
      } else {
        losses++;
      }
      
      totalCrowns += myCrowns;
      totalTrophyChange += myTeam.trophyChange || 0;

      // Track deck performance
      if (myTeam.cards && myTeam.cards.length === 8) {
        const deckCards = myTeam.cards.map((c: any) => c.name).sort();
        const deckHash = deckCards.join('|');
        
        if (!deckPerformance.has(deckHash)) {
          deckPerformance.set(deckHash, {
            wins: 0,
            losses: 0,
            battles: 0,
            cards: deckCards
          });
        }
        
        const deckStats = deckPerformance.get(deckHash)!;
        deckStats.battles++;
        if (myCrowns > opponentCrowns) {
          deckStats.wins++;
        } else {
          deckStats.losses++;
        }
      }
    }

    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;
    const avgCrowns = totalBattles > 0 ? totalCrowns / totalBattles : 0;
    const avgTrophyChange = totalBattles > 0 ? totalTrophyChange / totalBattles : 0;

    // Calculate deck stats
    const deckStats = Array.from(deckPerformance.entries()).map(([hash, stats]) => ({
      deckHash: hash,
      cards: stats.cards,
      wins: stats.wins,
      losses: stats.losses,
      battles: stats.battles,
      winRate: stats.battles > 0 ? (stats.wins / stats.battles) * 100 : 0
    })).sort((a, b) => b.battles - a.battles);

    return new Response(JSON.stringify({
      totalBattles,
      wins,
      losses,
      winRate: parseFloat(winRate.toFixed(1)),
      avgCrowns: parseFloat(avgCrowns.toFixed(1)),
      avgTrophyChange: parseFloat(avgTrophyChange.toFixed(1)),
      deckStats: deckStats.slice(0, 5) // Top 5 most used decks
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in calculate-player-stats:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
