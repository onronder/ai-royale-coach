import { recentStatistics } from '../_shared/recent-statistics.ts';
import { canonicalTag } from '../_shared/battle-observation.ts';
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
    if (typeof body.playerTag !== 'string' || !body.playerTag.trim()) return errorResponse('Player tag required', 400);
    playerTag = canonicalTag(body.playerTag);
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
    const startedAt = new Date().toISOString();
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

    if (battleError || !Array.isArray(battles)) {
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

    const result = recentStatistics(battles, playerTag);
    if (await checkCancellation()) return jsonResponse({ success: false, message: 'Operation cancelled' });
    const { error: saveError } = await supabase.rpc('replace_recent_observations', {
      p_user: user.id, p_tag: playerTag, p_feature: 'cards', p_started: startedAt,
      p_rows: result.cards, p_samples: result.summary.total, p_excluded: result.summary.excluded,
    });
    if (saveError) throw saveError;

    await updateProgress(100, 100, 'Completed!', 'completed');

    logger.info('Successfully calculated mastery', { cardsProcessed: result.cards.length });

    return jsonResponse({ 
      success: true, 
      cards_processed: result.cards.length
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
