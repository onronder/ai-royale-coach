import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const CLASH_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

    logger.info('Fetched players from global leaderboard', { count: players.length });

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
      logger.error('Failed to upsert leaderboard entries', { error: upsertError.message });
      throw upsertError;
    }

    logger.info('Successfully synced leaderboard entries', { count: entries.length });

    return jsonResponse({ 
      success: true, 
      count: entries.length,
      message: `Synced ${entries.length} players to leaderboard` 
    });

  } catch (error) {
    logger.error('Error in sync-leaderboard', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
