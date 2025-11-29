import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate consistent deck hash for matchup lookups
function generateDeckHash(deckA: string[], deckB: string[]): string {
  const sortedDeckA = [...deckA].sort().join('|');
  const sortedDeckB = [...deckB].sort().join('|');
  const [first, second] = [sortedDeckA, sortedDeckB].sort();
  return `${first}::${second}`;
}

// Parse Clash Royale API battle time format: "20251129T081521.000Z"
function parseBattleTime(battleTime: string): Date {
  if (!battleTime) return new Date(0);
  // Handle format like "20251129T081521.000Z"
  const formatted = battleTime.replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  );
  return new Date(formatted);
}

// Compare arrays of cards (sorted) to check if they match
function decksMatch(deck1: string[], deck2: any[]): boolean {
  if (!deck1 || !deck2 || deck1.length !== deck2.length) return false;
  const sorted1 = [...deck1].sort();
  const sorted2 = [...deck2].sort();
  return sorted1.every((card, i) => card === sorted2[i]);
}

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
    console.log('Fetching battles for player:', playerTag);
    const { data: battles, error: battleError } = await supabase.functions.invoke('clash-royale-api', {
      body: { 
        endpoint: 'battles',
        playerTag: playerTag 
      }
    });

    if (battleError || !battles) {
      console.error('Failed to fetch battle log:', battleError);
      throw new Error('Failed to fetch battle log');
    }

    console.log(`Processing ${battles.length} battles for deck stats`);

    // ==========================================
    // PART 1: Deck Usage Stats (existing logic)
    // ==========================================
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
          total_crowns: 0,
          total_trophy_change: 0,
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
    console.log(`Successfully tracked ${deckStats.size} decks`);

    // ==========================================
    // PART 2: Battle Outcome Tracking for Predictions
    // ==========================================
    console.log('Starting prediction outcome tracking...');
    
    // Fetch user's existing predictions
    const { data: predictions, error: predError } = await supabase
      .from('matchup_predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag);

    if (predError) {
      console.error('Failed to fetch predictions:', predError);
    }

    if (predictions && predictions.length > 0) {
      console.log(`Found ${predictions.length} predictions to check for outcome tracking`);
      
      // Create a map of deck_hash -> prediction for quick lookup
      const predictionMap = new Map<string, any>();
      for (const pred of predictions) {
        predictionMap.set(pred.deck_hash, pred);
      }

      // Track updates to batch at the end
      const predictionUpdates = new Map<string, {
        wins: number;
        losses: number;
        total: number;
        newestBattleTime: Date;
        predictionId: string;
        predictedWinRateA: number;
        isDeckA: boolean;
      }>();

      // Process each battle for prediction outcome tracking
      for (const battle of battles) {
        if (!battle.team?.[0]?.cards || !battle.opponent?.[0]?.cards) continue;
        
        // Extract and sort deck cards
        const playerDeck = battle.team[0].cards.map((c: any) => c.name).sort();
        const opponentDeck = battle.opponent[0].cards.map((c: any) => c.name).sort();
        
        // Generate matchup hash
        const matchupHash = generateDeckHash(playerDeck, opponentDeck);
        
        // Check if we have a prediction for this matchup
        const prediction = predictionMap.get(matchupHash);
        if (!prediction) continue;
        
        // Parse battle time
        const battleTime = parseBattleTime(battle.battleTime);
        const lastBattleAt = prediction.last_battle_at ? new Date(prediction.last_battle_at) : new Date(0);
        
        // Skip if battle is not newer than last recorded
        if (battleTime <= lastBattleAt) {
          continue;
        }
        
        // Determine if player is Deck A or Deck B
        const deckACards = Array.isArray(prediction.deck_a_cards) ? prediction.deck_a_cards : [];
        const playerIsDeckA = decksMatch(playerDeck, deckACards);
        
        // Determine battle outcome
        const playerWon = battle.team[0].crowns > (battle.opponent[0]?.crowns || 0);
        
        // Get or create update entry
        if (!predictionUpdates.has(matchupHash)) {
          predictionUpdates.set(matchupHash, {
            wins: prediction.actual_wins_deck_a || 0,
            losses: prediction.actual_losses_deck_a || 0,
            total: prediction.actual_battles_total || 0,
            newestBattleTime: lastBattleAt,
            predictionId: prediction.id,
            predictedWinRateA: prediction.predicted_win_rate_a,
            isDeckA: playerIsDeckA
          });
        }
        
        const update = predictionUpdates.get(matchupHash)!;
        update.total++;
        
        // Update wins/losses based on who won
        if (playerIsDeckA) {
          // Player used Deck A
          if (playerWon) {
            update.wins++;
          } else {
            update.losses++;
          }
        } else {
          // Player used Deck B, so Deck A is the opponent
          if (playerWon) {
            // Player (Deck B) won, so Deck A lost
            update.losses++;
          } else {
            // Player (Deck B) lost, so Deck A won
            update.wins++;
          }
        }
        
        // Track newest battle time
        if (battleTime > update.newestBattleTime) {
          update.newestBattleTime = battleTime;
        }
        
        console.log(`Battle tracked: ${playerIsDeckA ? 'Player as Deck A' : 'Player as Deck B'}, Won: ${playerWon}`);
      }

      // Apply batched updates to predictions
      let predictionsUpdated = 0;
      for (const [hash, update] of predictionUpdates) {
        // Calculate prediction error
        const actualWinRateA = update.total > 0 ? (update.wins / update.total) * 100 : 0;
        const predictionError = update.predictedWinRateA - actualWinRateA;
        
        const { error: updateError } = await supabase
          .from('matchup_predictions')
          .update({
            actual_wins_deck_a: update.wins,
            actual_losses_deck_a: update.losses,
            actual_battles_total: update.total,
            prediction_error: predictionError,
            last_battle_at: update.newestBattleTime.toISOString()
          })
          .eq('id', update.predictionId);

        if (updateError) {
          console.error(`Failed to update prediction ${update.predictionId}:`, updateError);
        } else {
          predictionsUpdated++;
          console.log(`Updated prediction ${hash}: wins=${update.wins}, losses=${update.losses}, error=${predictionError.toFixed(1)}%`);
        }
      }
      
      console.log(`Successfully updated ${predictionsUpdated} predictions with battle outcomes`);
    } else {
      console.log('No predictions found for outcome tracking');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      decks_tracked: deckStats.size,
      predictions_checked: predictions?.length || 0
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
