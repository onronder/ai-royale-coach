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

// Archetype detection based on key cards
interface ArchetypeDefinition {
  name: string;
  keyCards: string[];
  minMatches: number;
}

const ARCHETYPE_DEFINITIONS: ArchetypeDefinition[] = [
  // Cycle archetypes
  { name: 'Hog Cycle', keyCards: ['Hog Rider', 'Musketeer', 'Ice Spirit', 'Skeletons', 'Cannon'], minMatches: 3 },
  { name: 'Miner Cycle', keyCards: ['Miner', 'Poison', 'Wall Breakers', 'Valkyrie'], minMatches: 2 },
  { name: 'X-Bow Cycle', keyCards: ['X-Bow', 'Tesla', 'Archers', 'Ice Spirit'], minMatches: 2 },
  { name: 'Mortar Cycle', keyCards: ['Mortar', 'Rocket', 'Brawler', 'Miner'], minMatches: 2 },
  
  // Beatdown archetypes
  { name: 'Golem Beatdown', keyCards: ['Golem', 'Night Witch', 'Lumberjack', 'Lightning'], minMatches: 2 },
  { name: 'Lava Hound', keyCards: ['Lava Hound', 'Balloon', 'Tombstone', 'Miner'], minMatches: 2 },
  { name: 'Giant Beatdown', keyCards: ['Giant', 'Witch', 'Musketeer', 'Graveyard'], minMatches: 2 },
  { name: 'E-Giant Beatdown', keyCards: ['Electro Giant', 'Dark Prince', 'Tornado', 'Lightning'], minMatches: 2 },
  { name: 'Royal Giant', keyCards: ['Royal Giant', 'Fisherman', 'Hunter', 'Lightning'], minMatches: 2 },
  
  // Bridge Spam archetypes
  { name: 'Pekka Bridge Spam', keyCards: ['P.E.K.K.A', 'Battle Ram', 'Bandit', 'Royal Ghost', 'Electro Wizard'], minMatches: 3 },
  { name: 'Ram Rider Bridge Spam', keyCards: ['Ram Rider', 'Bandit', 'Magic Archer', 'Barbarian Barrel'], minMatches: 2 },
  
  // Control archetypes
  { name: 'Splashyard', keyCards: ['Graveyard', 'Bowler', 'Baby Dragon', 'Tornado', 'Poison'], minMatches: 3 },
  { name: 'Miner Control', keyCards: ['Miner', 'Poison', 'Inferno Tower', 'Electro Wizard'], minMatches: 2 },
  { name: 'Ice Bow', keyCards: ['X-Bow', 'Ice Wizard', 'Tornado', 'Rocket'], minMatches: 3 },
  
  // Bait archetypes
  { name: 'Log Bait', keyCards: ['Goblin Barrel', 'Princess', 'Goblin Gang', 'Inferno Tower', 'Rocket'], minMatches: 3 },
  { name: 'Prince Bait', keyCards: ['Prince', 'Dark Prince', 'Goblin Barrel', 'Rascals'], minMatches: 2 },
  { name: 'Rocket Bait', keyCards: ['Goblin Barrel', 'Rocket', 'Inferno Tower', 'Princess'], minMatches: 3 },
  
  // Siege archetypes
  { name: 'X-Bow Siege', keyCards: ['X-Bow', 'Tesla', 'Rocket', 'Knight', 'Archers'], minMatches: 3 },
  { name: 'Mortar Siege', keyCards: ['Mortar', 'Rocket', 'Knight', 'Archers'], minMatches: 2 },
  
  // Spell cycle
  { name: 'Spell Cycle', keyCards: ['Rocket', 'Mirror', 'Tornado', 'Ice Wizard'], minMatches: 3 },
  
  // Three Musketeers
  { name: 'Three Musketeers', keyCards: ['Three Musketeers', 'Elixir Collector', 'Battle Ram'], minMatches: 2 },
  
  // Mega Knight
  { name: 'Mega Knight', keyCards: ['Mega Knight', 'Skeleton Barrel', 'Bats', 'Inferno Dragon'], minMatches: 2 },
];

function detectArchetype(cards: string[]): string {
  const cardNames = cards.map(c => c.toLowerCase());
  let bestMatch = { archetype: 'Unknown', score: 0, minRequired: 0 };
  
  for (const arch of ARCHETYPE_DEFINITIONS) {
    const matches = arch.keyCards.filter(keyCard =>
      cardNames.some(c => c.includes(keyCard.toLowerCase()))
    ).length;
    
    // Calculate match ratio relative to minimum required
    const matchRatio = matches / arch.minMatches;
    
    if (matches >= arch.minMatches && matchRatio > bestMatch.score / Math.max(bestMatch.minRequired, 1)) {
      bestMatch = { archetype: arch.name, score: matches, minRequired: arch.minMatches };
    }
  }
  
  // Fallback detection based on single key cards if no archetype matched
  if (bestMatch.archetype === 'Unknown') {
    const keyCardFallbacks: Record<string, string> = {
      'golem': 'Beatdown',
      'lava hound': 'Beatdown',
      'giant': 'Beatdown',
      'electro giant': 'Beatdown',
      'royal giant': 'Beatdown',
      'hog rider': 'Cycle',
      'miner': 'Control',
      'x-bow': 'Siege',
      'mortar': 'Siege',
      'goblin barrel': 'Bait',
      'graveyard': 'Control',
      'three musketeers': 'Split Push',
      'mega knight': 'Counter Push',
      'p.e.k.k.a': 'Bridge Spam',
      'ram rider': 'Bridge Spam',
    };
    
    for (const cardName of cardNames) {
      for (const [key, archetype] of Object.entries(keyCardFallbacks)) {
        if (cardName.includes(key)) {
          return archetype;
        }
      }
    }
  }
  
  return bestMatch.archetype;
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
    // PART 1: Deck Usage Stats with Archetype Tracking
    // ==========================================
    const deckStats = new Map<string, any>();
    
    for (const battle of battles) {
      if (!battle.team || !battle.team[0] || !battle.team[0].cards) continue;
      
      const cards = battle.team[0].cards.map((c: any) => c.name).sort();
      const deckHash = cards.join('|');
      
      // Detect player's deck archetype
      const playerArchetype = detectArchetype(cards);
      
      // Detect opponent's deck archetype
      let opponentArchetype = 'Unknown';
      if (battle.opponent?.[0]?.cards) {
        const opponentCards = battle.opponent[0].cards.map((c: any) => c.name);
        opponentArchetype = detectArchetype(opponentCards);
      }
      
      if (!deckStats.has(deckHash)) {
        deckStats.set(deckHash, {
          deck_cards: cards,
          archetype: playerArchetype,
          battles_played: 0,
          battles_won: 0,
          battles_lost: 0,
          total_crowns: 0,
          total_trophy_change: 0,
          avg_elixir: cards.reduce((sum: number, cardName: string) => {
            const card = battle.team[0].cards.find((c: any) => c.name === cardName);
            return sum + (card?.elixir || 0);
          }, 0) / cards.length,
          opponent_archetypes: [] as string[],
          wins_by_opponent_archetype: {} as Record<string, number>,
          losses_by_opponent_archetype: {} as Record<string, number>,
        });
      }
      
      const stats = deckStats.get(deckHash);
      stats.battles_played++;
      
      // Track opponent archetype
      if (opponentArchetype !== 'Unknown' && !stats.opponent_archetypes.includes(opponentArchetype)) {
        stats.opponent_archetypes.push(opponentArchetype);
      }
      
      const playerWon = battle.team[0].crowns > (battle.opponent?.[0]?.crowns || 0);
      
      if (playerWon) {
        stats.battles_won++;
        // Track wins by opponent archetype
        if (opponentArchetype !== 'Unknown') {
          stats.wins_by_opponent_archetype[opponentArchetype] = 
            (stats.wins_by_opponent_archetype[opponentArchetype] || 0) + 1;
        }
      } else {
        stats.battles_lost++;
        // Track losses by opponent archetype
        if (opponentArchetype !== 'Unknown') {
          stats.losses_by_opponent_archetype[opponentArchetype] = 
            (stats.losses_by_opponent_archetype[opponentArchetype] || 0) + 1;
        }
      }
      
      stats.total_crowns += battle.team[0].crowns || 0;
      stats.total_trophy_change += battle.team[0].trophyChange || 0;
    }

    // Upsert deck stats for today with archetype data
    const today = new Date().toISOString().split('T')[0];
    const upsertPromises = Array.from(deckStats.entries()).map(([deckHash, stats]) => {
      return supabase.from('deck_usage_stats').upsert({
        user_id: user.id,
        player_tag: playerTag,
        deck_hash: deckHash,
        date: today,
        deck_cards: stats.deck_cards,
        archetype: stats.archetype,
        battles_played: stats.battles_played,
        battles_won: stats.battles_won,
        battles_lost: stats.battles_lost,
        total_crowns: stats.total_crowns,
        total_trophy_change: stats.total_trophy_change,
        avg_elixir: stats.avg_elixir,
        opponent_archetypes: stats.opponent_archetypes,
        wins_by_opponent_archetype: stats.wins_by_opponent_archetype,
        losses_by_opponent_archetype: stats.losses_by_opponent_archetype,
      }, {
        onConflict: 'user_id,deck_hash,date'
      });
    });

    await Promise.all(upsertPromises);
    console.log(`Successfully tracked ${deckStats.size} decks with archetype data`);

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

    let predictionsUpdated = 0;

    if (predictions && predictions.length > 0) {
      console.log(`Found ${predictions.length} predictions to check for outcome tracking`);
      
      const predictionMap = new Map<string, any>();
      for (const pred of predictions) {
        predictionMap.set(pred.deck_hash, pred);
      }

      const predictionUpdates = new Map<string, {
        wins: number;
        losses: number;
        total: number;
        newestBattleTime: Date;
        predictionId: string;
        predictedWinRateA: number;
        isDeckA: boolean;
      }>();

      for (const battle of battles) {
        if (!battle.team?.[0]?.cards || !battle.opponent?.[0]?.cards) continue;
        
        const playerDeck = battle.team[0].cards.map((c: any) => c.name).sort();
        const opponentDeck = battle.opponent[0].cards.map((c: any) => c.name).sort();
        
        const matchupHash = generateDeckHash(playerDeck, opponentDeck);
        
        const prediction = predictionMap.get(matchupHash);
        if (!prediction) continue;
        
        const battleTime = parseBattleTime(battle.battleTime);
        const lastBattleAt = prediction.last_battle_at ? new Date(prediction.last_battle_at) : new Date(0);
        
        if (battleTime <= lastBattleAt) continue;
        
        const deckACards = Array.isArray(prediction.deck_a_cards) ? prediction.deck_a_cards : [];
        const playerIsDeckA = decksMatch(playerDeck, deckACards);
        const playerWon = battle.team[0].crowns > (battle.opponent[0]?.crowns || 0);
        
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
        
        if (playerIsDeckA) {
          if (playerWon) update.wins++;
          else update.losses++;
        } else {
          if (playerWon) update.losses++;
          else update.wins++;
        }
        
        if (battleTime > update.newestBattleTime) {
          update.newestBattleTime = battleTime;
        }
      }

      for (const [hash, update] of predictionUpdates) {
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

        if (!updateError) predictionsUpdated++;
      }
    }

    // ==========================================
    // PART 3: Track Recommendation Adoption
    // ==========================================
    console.log('Checking for recommendation adoptions...');
    
    const { data: pendingRecs } = await supabase
      .from('recommendation_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag)
      .eq('adopted', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    let recommendationsAdopted = 0;

    if (pendingRecs && pendingRecs.length > 0) {
      console.log(`Found ${pendingRecs.length} pending recommendations to check`);
      
      for (const rec of pendingRecs) {
        const recCards = rec.recommended_cards as string[] || [];
        if (recCards.length === 0) continue;
        
        // Check if any battle used this recommended deck
        for (const battle of battles) {
          if (!battle.team?.[0]?.cards) continue;
          
          const battleDeck = battle.team[0].cards.map((c: any) => c.name).sort();
          
          if (decksMatch(battleDeck, recCards)) {
            // Calculate win rate before adoption from recent stats
            const { data: recentStats } = await supabase
              .from('deck_usage_stats')
              .select('battles_won, battles_lost')
              .eq('user_id', user.id)
              .eq('player_tag', playerTag)
              .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            
            let winRateBefore = 0;
            if (recentStats && recentStats.length > 0) {
              const totalWins = recentStats.reduce((sum, s) => sum + (s.battles_won || 0), 0);
              const totalLosses = recentStats.reduce((sum, s) => sum + (s.battles_lost || 0), 0);
              winRateBefore = totalWins + totalLosses > 0 
                ? (totalWins / (totalWins + totalLosses)) * 100 
                : 0;
            }
            
            const { error: adoptError } = await supabase
              .from('recommendation_history')
              .update({
                adopted: true,
                adopted_at: new Date().toISOString(),
                win_rate_before: winRateBefore
              })
              .eq('id', rec.id);
            
            if (!adoptError) {
              recommendationsAdopted++;
              console.log(`Recommendation ${rec.id} marked as adopted`);
            }
            break;
          }
        }
      }
    }

    // ==========================================
    // PART 4: Update Success Metrics for Adopted Recommendations
    // ==========================================
    console.log('Updating success metrics for adopted recommendations...');
    
    const { data: adoptedRecs } = await supabase
      .from('recommendation_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag)
      .eq('adopted', true)
      .is('outcome_tracked_at', null)
      .gte('adopted_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    let successMetricsUpdated = 0;

    if (adoptedRecs && adoptedRecs.length > 0) {
      for (const rec of adoptedRecs) {
        const recCards = rec.recommended_cards as string[] || [];
        if (recCards.length === 0) continue;
        
        // Count battles with this recommended deck since adoption
        let battlesWithDeck = 0;
        let winsWithDeck = 0;
        
        const adoptedAt = new Date(rec.adopted_at);
        
        for (const battle of battles) {
          if (!battle.team?.[0]?.cards || !battle.battleTime) continue;
          
          const battleTime = parseBattleTime(battle.battleTime);
          if (battleTime < adoptedAt) continue;
          
          const battleDeck = battle.team[0].cards.map((c: any) => c.name).sort();
          
          if (decksMatch(battleDeck, recCards)) {
            battlesWithDeck++;
            const playerWon = battle.team[0].crowns > (battle.opponent?.[0]?.crowns || 0);
            if (playerWon) winsWithDeck++;
          }
        }
        
        // Only update if player has played at least 5 battles with the deck
        if (battlesWithDeck >= 5) {
          const winRateAfter = (winsWithDeck / battlesWithDeck) * 100;
          
          const { error: updateError } = await supabase
            .from('recommendation_history')
            .update({
              battles_after_adoption: battlesWithDeck,
              wins_after_adoption: winsWithDeck,
              win_rate_after: winRateAfter,
              outcome_tracked_at: new Date().toISOString()
            })
            .eq('id', rec.id);
          
          if (!updateError) {
            successMetricsUpdated++;
            console.log(`Updated success metrics for recommendation ${rec.id}: ${winRateAfter.toFixed(1)}% win rate`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      decks_tracked: deckStats.size,
      predictions_updated: predictionsUpdated,
      recommendations_adopted: recommendationsAdopted,
      success_metrics_updated: successMetricsUpdated
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
