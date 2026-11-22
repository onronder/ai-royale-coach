import type { Json } from '@/integrations/supabase/types';
import type { ClashRoyalePlayer } from '@/services/clashRoyaleApi';
import type { SavedDeckRow } from '@/types/dashboard.types';
import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
import { completedCollection, type CollectionRead } from './deckUpgradePlan';

type SavedDeck = Pick<SavedDeckRow, 'id' | 'user_id' | 'cards'>;
type Slot = {
  deckNumber: number; // 1 is the pinned main deck; deck and slot numbers are one-based.
  savedDeckId: string | null;
  slot: number;
  reference: Json;
};
type Conflict = { cardId: number; name: string; locations: Slot[] };

/** Compare base cards only. A conflict-free comparison is not a tournament eligibility check. */
export function checkCrownSeriesConflicts(
  rules: string,
  collection: CollectionRead & { userId: string; playerTag: string },
  main: Pick<ClashRoyalePlayer, 'tag' | 'currentDeck'>,
  saved: readonly SavedDeck[],
) {
  if (rules !== 'crown-series-3x8-v1' && rules !== 'crown-series-4x8-v1') {
    return { status: 'unsupported_rules' } as const;
  }
  const deckCount = rules === 'crown-series-3x8-v1' ? 3 : 4;
  if (saved.length + 1 !== deckCount || new Set(saved.map(deck => deck.id)).size !== saved.length) {
    return { status: 'invalid_selection' } as const;
  }
  const tag = canonicalTag(collection.playerTag);
  if (!collection.userId || tag === '#' || canonicalTag(main.tag) !== tag ||
      saved.some(deck => deck.user_id !== collection.userId)) {
    return { status: 'scope_mismatch' } as const;
  }
  const snapshot = completedCollection(collection, collection.userId, tag);
  if (!snapshot) return { status: 'collection_unavailable' } as const;

  const decks = [
    { id: null, cards: main.currentDeck?.map(card => card?.id) ?? [] },
    ...saved.map(deck => ({ id: deck.id, cards: Array.isArray(deck.cards) ? deck.cards : [] })),
  ];
  const byCard = new Map<number, Conflict>();
  const unresolved: (Slot & { reason: 'empty' | 'unrecognized' | 'ambiguous' })[] = [];
  let filledSlots = 0;
  for (const [index, deck] of decks.entries()) {
    const deckNumber = index + 1;
    if (deck.cards.length > 8) return { status: 'invalid_deck_size', deckNumber, savedDeckId: deck.id } as const;
    for (let slot = 1; slot <= 8; slot++) {
      const reference = deck.cards[slot - 1] ?? null;
      const location = { deckNumber, savedDeckId: deck.id, slot, reference };
      if (reference === null || (typeof reference === 'string' && !reference.trim())) {
        unresolved.push({ ...location, reason: 'empty' });
        continue;
      }
      filledSlots++;
      // Older saved decks may store the full API card. Both identity fields must agree.
      const legacyCard = deck.id !== null && typeof reference === 'object' && !Array.isArray(reference)
        ? reference : undefined;
      const matches = snapshot.cards.filter(card => legacyCard
        ? legacyCard.id === card.card_id && legacyCard.name === card.card_name
        : reference === card.card_id || (deck.id !== null && reference === card.card_name));
      const card = matches[0];
      if (matches.length !== 1 || !Number.isSafeInteger(card.card_id) || card.card_id <= 0) {
        unresolved.push({ ...location, reason: matches.length > 1 ? 'ambiguous' : 'unrecognized' });
        continue;
      }
      const group = byCard.get(card.card_id);
      if (group) group.locations.push(location);
      else byCard.set(card.card_id, { cardId: card.card_id, name: card.card_name, locations: [location] });
    }
  }

  const withinDeck: Conflict[] = [];
  const acrossDecks: Conflict[] = [];
  for (const group of byCard.values()) {
    if (group.locations.length === 1) continue;
    const deckNumbers = new Set(group.locations.map(location => location.deckNumber));
    if (deckNumbers.size > 1) acrossDecks.push(group);
    for (const deckNumber of deckNumbers) {
      const locations = group.locations.filter(location => location.deckNumber === deckNumber);
      if (locations.length > 1) withinDeck.push({ ...group, locations });
    }
  }

  return {
    status: 'compared', rules, asOf: snapshot.asOf, filledSlots,
    knownUniqueCards: byCard.size, uniqueCards: unresolved.length ? null : byCard.size,
    withinDeck, acrossDecks, unresolved,
  } as const;
}
