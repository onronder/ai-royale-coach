import { battleTimestamp, latestLadderTrophies, type Battle } from '../../supabase/functions/_shared/coaching-match';

export interface TrophySnapshot { before: number; after: number }

export function withBattleTrophies<T extends { trophies: number; bestTrophies: number }>(player: T, snapshot?: TrophySnapshot) {
  if (!snapshot || player.trophies !== snapshot.before) return player;
  return { ...player, trophies: snapshot.after, bestTrophies: Math.max(player.bestTrophies, snapshot.after) };
}

// The player profile can lag the battle log for its five-minute cache lifetime.
export function withRecentLadderTrophies<T extends { tag: string; trophies: number; bestTrophies: number }>(
  player: T, battles: Battle[], now = Date.now(),
) {
  const recent = battles.filter(battle => {
    const age = now - battleTimestamp(battle.battleTime);
    return age >= 0 && age <= 5 * 60_000;
  });
  return withBattleTrophies(player, latestLadderTrophies(player.tag, recent) ?? undefined);
}

/** Only a ladder log with both totals can place a point on the trophy chart. */
export function ladderTrophyHistory<T extends Battle>(tag: string, battles: T[]) {
  return battles.flatMap(battle => {
    const snapshot = latestLadderTrophies(tag, [battle]);
    return snapshot ? [{ battle, time: battleTimestamp(battle.battleTime), ...snapshot }] : [];
  }).sort((a, b) => a.time - b.time);
}
