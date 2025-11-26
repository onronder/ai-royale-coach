import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { playerTag, userId } = await req.json();
    
    if (!playerTag || !userId) {
      throw new Error('playerTag and userId are required');
    }

    const CLASH_ROYALE_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!CLASH_ROYALE_API_KEY) {
      throw new Error('CLASH_ROYALE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch player data from Clash Royale API
    const normalizedTag = playerTag.replace('#', '');
    const response = await fetch(
      `https://proxy.royaleapi.dev/v1/players/%23${normalizedTag}`,
      {
        headers: {
          'Authorization': `Bearer ${CLASH_ROYALE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Clash Royale API error: ${response.status}`);
    }

    const playerData = await response.json();
    const cards = playerData.cards || [];

    console.log(`Syncing ${cards.length} cards for player ${playerTag}`);

    // Upsert each card into the collection
    for (const card of cards) {
      const { error } = await supabase
        .from('card_collection')
        .upsert({
          user_id: userId,
          player_tag: playerTag,
          card_id: card.id,
          card_name: card.name,
          card_level: card.level,
          card_count: card.count || 0,
          max_level: card.maxLevel,
          rarity: card.rarity || 'Common',
          elixir_cost: card.elixirCost,
          icon_url: card.iconUrls?.medium,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,player_tag,card_id'
        });

      if (error) {
        console.error(`Error upserting card ${card.name}:`, error);
      }
    }

    // Also sync player to leaderboard
    const { error: leaderboardError } = await supabase
      .from('leaderboard_entries')
      .upsert({
        player_tag: playerTag,
        player_name: playerData.name,
        trophies: playerData.trophies,
        clan_tag: playerData.clan?.tag,
        clan_name: playerData.clan?.name,
        arena_name: playerData.arena?.name,
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'player_tag'
      });

    if (leaderboardError) {
      console.error('Error updating leaderboard:', leaderboardError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_cards: cards.length,
        message: 'Card collection and leaderboard synced successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-card-collection:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
