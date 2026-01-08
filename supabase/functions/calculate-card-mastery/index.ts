import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  // Store request body early to avoid "Body already consumed" error
  let playerTag: string;
  try {
    const body = await req.json();
    playerTag = body.playerTag;
  } catch (e) {
    return errorResponse('Invalid request body', 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user from auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('Unauthorized', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    // Helper function to check for cancellation
    const checkCancellation = async () => {
      try {
        const { data } = await supabase
          .from('operation_progress')
          .select('status')
          .eq('user_id', user.id)
          .eq('player_tag', playerTag)
          .eq('operation_type', 'card_mastery_calculation')
          .eq('status', 'cancelled')
          .maybeSingle();
        
        return data !== null;
      } catch (error) {
        logger.error('Error checking cancellation', { error: error instanceof Error ? error.message : 'Unknown' });
        return false;
      }
    };

    // Helper function to update progress
    const updateProgress = async (progress: number, total: number, currentStep: string, status = 'running') => {
      await supabase.from('operation_progress').upsert({
        user_id: user.id,
        player_tag: playerTag,
        operation_type: 'card_mastery_calculation',
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
    await updateProgress(0, 100, 'Starting calculation...');

    // Check for cancellation
    if (await checkCancellation()) {
      logger.info('Operation cancelled by user');
      await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
      return jsonResponse({ success: false, message: 'Operation cancelled' });
    }

    // Fetch battle log using correct endpoint format
    await updateProgress(10, 100, 'Fetching battle history...');
    
    logger.info('Fetching battles for card mastery calculation', { playerTag });
    const { data: battles, error: battleError } = await supabase.functions.invoke('clash-royale-api', {
      body: { 
        endpoint: 'battles',
        playerTag: playerTag 
      }
    });

    if (battleError || !battles) {
      logger.error('Failed to fetch battle log', { error: battleError });
      await updateProgress(0, 100, 'Failed to fetch battles', 'failed');
      throw new Error('Failed to fetch battle log');
    }

    logger.info('Processing battles for card mastery', { count: battles.length });

    // Check for cancellation
    if (await checkCancellation()) {
      logger.info('Operation cancelled by user');
      await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
      return jsonResponse({ success: false, message: 'Operation cancelled' });
    }

    await updateProgress(20, 100, 'Processing battles...');

    // Aggregate card stats
    const cardStats = new Map<number, any>();
    const totalBattles = battles.length;
    
    for (let i = 0; i < battles.length; i++) {
      const battle = battles[i];
      if (!battle.team || !battle.team[0] || !battle.team[0].cards) continue;
      
      const isWin = battle.team[0].crowns > (battle.opponent?.[0]?.crowns || 0);
      const crowns = battle.team[0].crowns || 0;
      const deckCards = battle.team[0].cards.map((c: any) => c.name);
      
      for (const card of battle.team[0].cards) {
        if (!cardStats.has(card.id)) {
          cardStats.set(card.id, {
            card_id: card.id,
            card_name: card.name,
            times_used: 0,
            battles_won: 0,
            battles_lost: 0,
            total_crowns: 0,
            partner_cards: new Map<string, number>(),
            opponent_cards: new Map<string, number>(),
          });
        }
        
        const stats = cardStats.get(card.id);
        stats.times_used++;
        stats.total_crowns += crowns;
        
        if (isWin) {
          stats.battles_won++;
          deckCards.forEach((partnerName: string) => {
            if (partnerName !== card.name) {
              stats.partner_cards.set(partnerName, (stats.partner_cards.get(partnerName) || 0) + 1);
            }
          });
        } else {
          stats.battles_lost++;
          battle.opponent?.[0]?.cards?.forEach((oppCard: any) => {
            stats.opponent_cards.set(oppCard.name, (stats.opponent_cards.get(oppCard.name) || 0) + 1);
          });
        }
      }

      // Update progress periodically
      if (i % 5 === 0) {
        const progressPercent = 20 + Math.floor((i / totalBattles) * 40);
        await updateProgress(progressPercent, 100, `Processing battle ${i + 1}/${totalBattles}...`);
        
        if (await checkCancellation()) {
          logger.info('Operation cancelled by user');
          await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
          return jsonResponse({ success: false, message: 'Operation cancelled' });
        }
      }
    }

    // Check for cancellation
    if (await checkCancellation()) {
      logger.info('Operation cancelled by user');
      await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
      return jsonResponse({ success: false, message: 'Operation cancelled' });
    }

    await updateProgress(60, 100, 'Calculating mastery levels...');

    // Calculate mastery levels and prepare upserts
    const upsertPromises = Array.from(cardStats.values()).map(stats => {
      const winRate = stats.battles_won / (stats.battles_won + stats.battles_lost);
      const crownAvg = stats.total_crowns / stats.times_used;
      
      const usageScore = Math.min(stats.times_used / 500, 1) * 40;
      const winScore = winRate * 35;
      const crownScore = (crownAvg / 3) * 25;
      const totalScore = usageScore + winScore + crownScore;
      
      const masteryLevel = Math.max(1, Math.min(10, Math.ceil(totalScore / 10)));
      const masteryProgress = Math.round((totalScore % 10) * 10);
      
      const bestPartners = (Array.from(stats.partner_cards.entries()) as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      
      const worstMatchups = (Array.from(stats.opponent_cards.entries()) as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      return supabase.from('card_mastery').upsert({
        user_id: user.id,
        player_tag: playerTag,
        card_id: stats.card_id,
        card_name: stats.card_name,
        times_used: stats.times_used,
        battles_won: stats.battles_won,
        battles_lost: stats.battles_lost,
        total_crowns: stats.total_crowns,
        best_partner_cards: bestPartners,
        worst_matchup_cards: worstMatchups,
        mastery_level: masteryLevel,
        mastery_progress: masteryProgress,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id,card_id'
      });
    });

    // Check for cancellation before saving
    if (await checkCancellation()) {
      logger.info('Operation cancelled by user');
      await updateProgress(0, 100, 'Cancelled by user', 'cancelled');
      return jsonResponse({ success: false, message: 'Operation cancelled' });
    }

    await updateProgress(80, 100, 'Saving mastery data...');
    
    await Promise.all(upsertPromises);

    await updateProgress(100, 100, 'Completed!', 'completed');

    logger.info('Successfully calculated mastery', { cardsProcessed: cardStats.size });

    return jsonResponse({ 
      success: true, 
      cards_processed: cardStats.size 
    });

  } catch (error) {
    logger.error('Error in calculate-card-mastery', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // Update progress to failed state
    try {
      await supabase.from('operation_progress').upsert({
        user_id: user.id,
        player_tag: playerTag,
        operation_type: 'card_mastery_calculation',
        status: 'failed',
        progress: 0,
        total: 100,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, {
        onConflict: 'user_id,player_tag,operation_type',
        ignoreDuplicates: false,
      });
    } catch (progressError) {
      logger.error('Failed to update progress', { error: progressError instanceof Error ? progressError.message : 'Unknown' });
    }
    
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
