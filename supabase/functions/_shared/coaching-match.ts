export type Battle = { battleTime: string; team: { tag: string; crowns: number; trophyChange?: number; cards: { id: number; name?: string; iconUrls?: { medium: string } }[] }[]; opponent: { tag: string; crowns: number; cards: { id: number; name?: string; iconUrls?: { medium: string } }[] }[] };
export const normalizeTag = (tag: string) => tag.replace(/^#/, '').toUpperCase();
export function battleTimestamp(value: string): number {
  const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/.exec(value);
  return Date.parse(compact ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}${compact[7] || ''}Z` : value);
}
export function deckKey(cards: {id: number}[]): string { return cards.map(c => c.id).sort((a,b) => a-b).join(','); }
export function firstTaskBattle(tag: string, shownAt: string, deck: {id: number}[], battles: Battle[]) {
  const cutoff = Date.parse(shownAt);
  if (!Number.isFinite(cutoff) || deck.length !== 8) return null;
  const seen = new Set<string>();
  const ordered = [...battles].sort((a,b) => battleTimestamp(a.battleTime)-battleTimestamp(b.battleTime));
  for (const battle of ordered) {
    const own = battle.team.find(p => normalizeTag(p.tag) === normalizeTag(tag));
    if (!own || battle.team.length !== 1 || battle.opponent.length !== 1 || !(battleTimestamp(battle.battleTime) > cutoff) || deckKey(own.cards) !== deckKey(deck)) continue;
    const key = `${normalizeTag(tag)}:${battle.battleTime}:${battle.opponent.map(p => normalizeTag(p.tag)).sort().join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const opponent = battle.opponent[0];
    return { key, battle_time: new Date(battleTimestamp(battle.battleTime)).toISOString(), score: [own.crowns, opponent.crowns], outcome: own.crowns > opponent.crowns ? 'win' : own.crowns < opponent.crowns ? 'loss' : 'draw', trophy_change: own.trophyChange ?? null, opponent_deck: opponent.cards };
  }
  return null;
}
