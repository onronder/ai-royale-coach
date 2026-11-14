import { battleTimestamp, normalizeTag } from './coaching-match.ts';

type Card = { id: number; name: string; level: number; maxLevel: number };
type Player = { tag: string; currentDeck: Card[]; cards: Card[] };
type HistoryEntry = {
  battleTime: string;
  type: string;
  deckSelection: string;
  gameMode?: { name: string };
  team: { tag: string; cards: { id: number }[] }[];
  opponent: unknown[];
};

function distinctCards(cards: { id: number }[], count: number) {
  return Array.isArray(cards) && cards.length === count &&
    cards.every(c => Number.isSafeInteger(c?.id) && c.id > 0) &&
    new Set(cards.map(c => c.id)).size === count;
}

type Resolution =
  | { kind: 'ready' | 'confirm'; cards: Card[] }
  | { kind: 'unavailable' };

export async function resolveCoachingDeck(
  player: Player | null, tag: string, loadBattles: () => Promise<HistoryEntry[] | null>, confirmedIds?: number[],
): Promise<Resolution> {
  if (!player || normalizeTag(player.tag) !== normalizeTag(tag) || !Array.isArray(player.cards) || !player.cards.length) {
    return { kind: 'unavailable' };
  }
  const { currentDeck } = player;
  let cards: Card[];
  if (distinctCards(currentDeck, 8)) {
    cards = currentDeck;
    if (!confirmedIds) return { kind: 'ready', cards };
  } else {
    if (!distinctCards(currentDeck, 7)) return { kind: 'unavailable' };
    const history = await loadBattles();
    if (!Array.isArray(history)) return { kind: 'unavailable' };
    const latest = history.filter(b => b?.type === 'PvP' && b.deckSelection === 'collection' &&
      b.gameMode?.name === 'Ladder' && b.team?.length === 1 && b.opponent?.length === 1 &&
      normalizeTag(b.team[0]?.tag ?? '') === normalizeTag(tag) && Number.isFinite(battleTimestamp(b.battleTime)))
      .sort((a, b) => battleTimestamp(b.battleTime) - battleTimestamp(a.battleTime))[0];
    const battleDeck = latest?.team[0].cards;
    if (!battleDeck || !distinctCards(battleDeck, 8)) return { kind: 'unavailable' };
    const present = new Map(currentDeck.map(card => [card.id, card]));
    const matching = battleDeck.filter(card => present.has(card.id));
    if (matching.length !== 7 || matching.some((card, i) => card.id !== currentDeck[i].id)) {
      return { kind: 'unavailable' };
    }
    // Battle levels can be capped. Keep profile cards and fill the missing slot from the owned collection.
    const owned = new Map(player.cards.map(card => [card.id, card]));
    cards = [];
    for (const { id } of battleDeck) {
      const card = present.get(id) ?? owned.get(id);
      if (!card) return { kind: 'unavailable' };
      cards.push(card);
    }
  }
  const confirmed = confirmedIds?.length === 8 && cards.every((card, i) => card.id === confirmedIds[i]);
  return { kind: confirmed ? 'ready' : 'confirm', cards };
}
