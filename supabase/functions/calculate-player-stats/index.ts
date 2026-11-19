import { observeBattles } from '../_shared/battle-observation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { playerTag } = await req.json();
    
    if (typeof playerTag !== 'string' || !playerTag.trim()) {
      return errorResponse('Player tag required', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return errorResponse('Unauthorized', 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return errorResponse('Unauthorized', 401);

    // Fetch player's battle log from API
    const { data: battles, error: battleError } = await supabase.functions.invoke('clash-royale-api', {
      body: { endpoint: 'battles', playerTag }
    });

    if (battleError || !Array.isArray(battles)) {
      throw new Error('Failed to fetch battle log');
    }

    const summary = observeBattles(battles, playerTag);
    const { total: totalBattles, wins, losses, draws } = summary;
    const trophySamples = summary.battles.filter(b => b.trophyChange !== null);
    const winRate = summary.winRate;
    const avgCrowns = totalBattles ? summary.battles.reduce((s, b) => s + b.player.crowns, 0) / totalBattles : null;
    const avgTrophyChange = trophySamples.length ? trophySamples.reduce((s, b) => s + b.trophyChange!, 0) / trophySamples.length : null;
    const deckPerformance = new Map<string, {wins: number; losses: number; draws: number; battles: number; cards: string[]; mode: string}>();
    for (const battle of summary.battles) {
      const key = `${battle.mode}:${battle.deck}`;
      const stats = deckPerformance.get(key) || { wins: 0, losses: 0, draws: 0, battles: 0, cards: battle.player.cards.map(c => c.name), mode: battle.mode };
      stats.battles++;
      if (battle.outcome === 'win') stats.wins++;
      else if (battle.outcome === 'loss') stats.losses++;
      else stats.draws++;
      deckPerformance.set(key, stats);
    }

    // Calculate deck stats
    const deckStats = Array.from(deckPerformance.entries()).map(([hash, stats]) => ({
      deckHash: hash,
      cards: stats.cards,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      mode: stats.mode,
      battles: stats.battles,
      winRate: stats.battles > 0 ? (stats.wins / stats.battles) * 100 : 0
    })).sort((a, b) => b.battles - a.battles);

    return jsonResponse({
      totalBattles,
      wins,
      losses, draws, excluded: summary.excluded, scope: summary.scope,
      winRate, avgCrowns, avgTrophyChange,
      deckStats: deckStats.slice(0, 5)
    });

  } catch (error) {
    logger.error('Error in calculate-player-stats', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
