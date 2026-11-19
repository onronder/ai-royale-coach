import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';
import { recentStatistics } from '../_shared/recent-statistics.ts';
import { canonicalTag } from '../_shared/battle-observation.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    if (typeof body.playerTag !== 'string' || !body.playerTag.trim()) return errorResponse('Player tag required', 400);
    const playerTag = canonicalTag(body.playerTag);
    const startedAt = new Date().toISOString();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Fetch battle log from clash-royale-api function
    logger.info('Fetching battles for player', { playerTag });
    const { data: battles, error: battleError } = await supabase.functions.invoke('clash-royale-api', {
      body: { 
        endpoint: 'battles',
        playerTag: playerTag 
      }
    });

    if (battleError || !Array.isArray(battles)) {
      logger.error('Failed to fetch battle log', { error: battleError });
      throw new Error('Failed to fetch battle log');
    }

    logger.info('Processing battles for deck stats', { count: battles.length });

    const result = recentStatistics(battles, playerTag);
    const { error: saveError } = await supabase.rpc('replace_recent_observations', {
      p_user: user.id, p_tag: playerTag, p_feature: 'decks', p_started: startedAt,
      p_rows: result.decks, p_samples: result.summary.total, p_excluded: result.summary.excluded,
    });
    if (saveError) throw saveError;
    const { error: outcomeError } = await supabase.rpc('record_observed_outcomes', {
      p_user: user.id, p_tag: playerTag, p_battles: result.summary.battles.filter(b => b.format === '1v1').map(b => ({
        key: b.key, time: b.time, mode: b.mode, outcome: b.outcome,
        deck: b.player.cards.map(c => c.name).sort(), opponent: b.opponents[0].cards.map(c => c.name).sort(),
      })),
    });
    if (outcomeError) throw outcomeError;
    return jsonResponse({ success: true, decks_tracked: result.decks.length, scope: result.summary.scope, sample_count: result.summary.total, excluded_count: result.summary.excluded });
  } catch (error) {
    logger.error('Error in track-deck-stats', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});
