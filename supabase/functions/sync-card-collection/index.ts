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
    // Parse request body first
    const { playerTag } = await req.json();
    
    if (!playerTag) {
      throw new Error('playerTag is required');
    }

    const CLASH_ROYALE_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!CLASH_ROYALE_API_KEY) {
      throw new Error('CLASH_ROYALE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // SECURITY FIX: Get user from auth token instead of trusting client-supplied userId
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

    // Use server-verified userId, not client-supplied
    const userId = user.id;

    // Helper function to check for cancellation
    const checkCancellation = async () => {
      try {
        const { data } = await supabase
          .from('operation_progress')
          .select('status')
          .eq('user_id', userId)
          .eq('player_tag', playerTag)
          .eq('operation_type', 'card_collection_sync')
          .eq('status', 'cancelled')
          .maybeSingle();
        
        return data !== null;
      } catch (error) {
        console.error('Error checking cancellation:', error);
        return false;
      }
    };

    // Helper function to update progress
    const updateProgress = async (progress: number, total: number, currentStep: string, status = 'running') => {
      await supabase.from('operation_progress').upsert({
        user_id: userId,
        player_tag: playerTag,
        operation_type: 'card_collection_sync',
        status,
        progress,
        total,
        current_step: currentStep,
        started_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,player_tag,operation_type',
        ignoreDuplicates: false,
      });
    };

    // Initialize progress tracking
    await updateProgress(0, 100, 'Starting sync...');

    // Check for cancellation
    if (await checkCancellation()) {
      console.log('Operation cancelled by user');
      await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
      return new Response(
        JSON.stringify({ success: false, message: 'Operation cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch player data from Clash Royale API
    await updateProgress(10, 100, 'Fetching player data...');
    
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
      await updateProgress(0, 100, 'Failed to fetch player data', 'failed');
      throw new Error(`Clash Royale API error: ${response.status}`);
    }

    // Check for cancellation
    if (await checkCancellation()) {
      console.log('Operation cancelled by user');
      await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
      return new Response(
        JSON.stringify({ success: false, message: 'Operation cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const playerData = await response.json();
    const cards = playerData.cards || [];

    console.log(`Syncing ${cards.length} cards for player ${playerTag}`);
    
    await updateProgress(30, 100, `Syncing ${cards.length} cards...`);

    // Upsert each card into the collection
    const totalCards = cards.length;
    for (let i = 0; i < cards.length; i++) {
      // Check for cancellation every 10 cards
      if (i % 10 === 0 && await checkCancellation()) {
        console.log('Operation cancelled by user');
        await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
        return new Response(
          JSON.stringify({ success: false, message: 'Operation cancelled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      const card = cards[i];
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
          evolution_level: card.evolutionLevel || 0,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,player_tag,card_id'
        });

      if (error) {
        console.error(`Error upserting card ${card.name}:`, error);
      }

      // Update progress every 10 cards
      if (i % 10 === 0) {
        const progressPercent = 30 + Math.floor((i / totalCards) * 50); // 30-80%
        await updateProgress(progressPercent, 100, `Synced ${i + 1}/${totalCards} cards...`);
      }
    }

    await updateProgress(85, 100, 'Updating leaderboard...');

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

    await updateProgress(100, 100, 'Sync completed!', 'completed');

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
