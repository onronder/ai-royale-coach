export interface TrophySnapshot { before: number; after: number }

export function withBattleTrophies<T extends { trophies: number; bestTrophies: number }>(player: T, snapshot?: TrophySnapshot) {
  if (!snapshot || player.trophies !== snapshot.before) return player;
  return { ...player, trophies: snapshot.after, bestTrophies: Math.max(player.bestTrophies, snapshot.after) };
}
