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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch battle log from clash-royale-api function
    const { data: battles, error: battleError } = await supabase.functions.invoke('clash-royale-api', {
      body: { endpoint: `players/${encodeURIComponent(playerTag)}/battlelog` }
    });

    if (battleError || !battles) {
      throw new Error('Failed to fetch battle log');
    }

    // Process battles and aggregate deck stats
    const deckStats = new Map<string, any>();
    
    for (const battle of battles) {
      if (!battle.team || !battle.team[0] || !battle.team[0].cards) continue;
      
      const cards = battle.team[0].cards.map((c: any) => c.name).sort();
      const deckHash = cards.join('|');
      
      if (!deckStats.has(deckHash)) {
        deckStats.set(deckHash, {
          deck_cards: cards,
          battles_played: 0,
          battles_won: 0,
          battles_lost: 0,
          total_crowns: battle.team[0].crowns || 0,
          total_trophy_change: battle.team[0].trophyChange || 0,
          avg_elixir: cards.reduce((sum: number, cardName: string) => {
            const card = battle.team[0].cards.find((c: any) => c.name === cardName);
            return sum + (card?.elixir || 0);
          }, 0) / cards.length,
        });
      }
      
      const stats = deckStats.get(deckHash);
      stats.battles_played++;
      
      if (battle.team[0].crowns > (battle.opponent?.[0]?.crowns || 0)) {
        stats.battles_won++;
      } else {
        stats.battles_lost++;
      }
      
      stats.total_crowns += battle.team[0].crowns || 0;
      stats.total_trophy_change += battle.team[0].trophyChange || 0;
    }

    // Upsert deck stats for today
    const today = new Date().toISOString().split('T')[0];
    const upsertPromises = Array.from(deckStats.entries()).map(([deckHash, stats]) => {
      return supabase.from('deck_usage_stats').upsert({
        user_id: user.id,
        player_tag: playerTag,
        deck_hash: deckHash,
        date: today,
        ...stats,
      }, {
        onConflict: 'user_id,deck_hash,date'
      });
    });

    await Promise.all(upsertPromises);

    return new Response(JSON.stringify({ 
      success: true, 
      decks_tracked: deckStats.size 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in track-deck-stats:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});