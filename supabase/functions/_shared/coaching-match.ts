import { observeBattles } from './battle-observation.ts';
export type Battle = { battleTime: string; type?: string; gameMode?: { name?: string }; team: { tag: string; crowns: number; trophyChange?: number; startingTrophies?: number; cards: { id: number; name?: string; iconUrls?: { medium: string } }[] }[]; opponent: { tag: string; crowns: number; cards: { id: number; name?: string; iconUrls?: { medium: string } }[] }[] };
export const normalizeTag = (tag: string) => tag.replace(/^#/, '').toUpperCase();
// Only the validated 1v1 matcher issues this player-scoped result key.
export const coachingMatchPrefix = (tag: string) => `coach-1v1-v1:${normalizeTag(tag)}:`;
export function battleTimestamp(value: string): number {
  const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/.exec(value);
  return Date.parse(compact ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}${compact[7] || ''}Z` : value);
}
export function deckKey(cards: {id: number}[]): string { return cards.map(c => c.id).sort((a,b) => a-b).join(','); }
export function firstTaskBattle(tag: string, shownAt: string, deck: {id: number}[], battles: Battle[]) {
  const cutoff = Date.parse(shownAt);
  if (!Number.isFinite(cutoff) || deck.length !== 8) return null;
  const target = deckKey(deck);
  const candidates = observeBattles(battles, tag).battles.filter(b =>
    b.format === '1v1' && Date.parse(b.time) > cutoff && deckKey(b.player.cards) === target);
  const match = candidates.sort((a,b) => a.time.localeCompare(b.time) || a.key.localeCompare(b.key))[0];
  if (!match) return null;
  return { key: coachingMatchPrefix(tag) + match.key, battle_time: match.time, score: [match.player.crowns, match.opponents[0].crowns],
    outcome: match.outcome, trophy_change: match.trophyChange, opponent_deck: match.opponents[0].cards };
}

// A task can match an older battle. Only the most recent ladder battle can
// corroborate a current trophy count; event and ranked modes use other scales.
export function latestLadderTrophies(tag: string, battles: Battle[]) {
  const latest = battles.filter(battle => battle?.type === 'PvP' && battle.gameMode?.name === 'Ladder' &&
    Number.isFinite(battleTimestamp(battle.battleTime)) && battle.team?.length === 1 && battle.opponent?.length === 1 && typeof battle.team[0]?.tag === 'string' &&
    normalizeTag(battle.team[0].tag) === normalizeTag(tag))
    .sort((a, b) => battleTimestamp(b.battleTime) - battleTimestamp(a.battleTime))[0];
  if (!latest) return null;
  const { startingTrophies: before, trophyChange: change } = latest.team[0];
  if (typeof before !== 'number' || typeof change !== 'number' ||
      !Number.isSafeInteger(before) || !Number.isSafeInteger(change) || before < 0 || before + change < 0) return null;
  return { before, after: before + change };
}
