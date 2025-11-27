import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLASH_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!CLASH_API_KEY) {
      throw new Error('CLASH_ROYALE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch global top 200 players
    const response = await fetch('https://proxy.royaleapi.dev/v1/locations/global/rankings/players?limit=200', {
      headers: {
        'Authorization': `Bearer ${CLASH_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Clash API returned status ${response.status}`);
    }

    const data = await response.json();
    const players = data.items || [];

    console.log(`Fetched ${players.length} players from global leaderboard`);

    // Prepare leaderboard entries
    const entries = players.map((player: any) => ({
      player_tag: player.tag,
      player_name: player.name,
      trophies: player.trophies,
      clan_tag: player.clan?.tag || null,
      clan_name: player.clan?.name || null,
      arena_name: player.arena?.name || null,
      last_synced_at: new Date().toISOString(),
    }));

    // Upsert into leaderboard_entries
    const { error: upsertError } = await supabase
      .from('leaderboard_entries')
      .upsert(entries, { onConflict: 'player_tag' });

    if (upsertError) {
      console.error('Failed to upsert leaderboard entries:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully synced ${entries.length} leaderboard entries`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: entries.length,
        message: `Synced ${entries.length} players to leaderboard` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in sync-leaderboard:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});