import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkCrownSeriesConflicts } from '../src/lib/crownSeriesConflicts';
import { calculateDeckUpgradePlan } from '../src/lib/deckUpgradePlan';
import type { ClashRoyaleCard } from '../src/services/clashRoyaleApi';
import type { Json } from '../src/integrations/supabase/types';

const userId = 'fixture-account';
const tag = '#QQQ';
const at = '2026-11-22T08:00:00.123456Z';
const three = 'crown-series-3x8-v1';
const four = 'crown-series-4x8-v1';
const cardName = (id: number) => id === 2 ? 'Rage' : id === 3 ? 'Knight' : 'Card ' + id;
const ids = (first: number, count = 8) => Array.from({ length: count }, (_, offset) => first + offset);
const snapshot = () => ({
  userId, playerTag: tag,
  sync: { status: 'completed', user_id: userId, player_tag: tag, started_at: at, last_successful_at: at, synced_cards: 32 },
  cards: ids(1, 32).map(card_id => ({
    user_id: userId, player_tag: 'QQQ', updated_at: at, card_id, card_name: cardName(card_id),
    rarity: 'epic', card_level: 7, max_level: 11, card_count: 80,
  })),
});
const main = { tag, currentDeck: ids(1).map((id): ClashRoyaleCard => ({
  id, name: cardName(id), level: 7, maxLevel: 11, iconUrls: { medium: '' },
  activeForm: id === 3 ? 'evolution' : 'base',
})) };
const saved = (id: string, first: number) => ({ id, user_id: userId, cards: ids(first).map(cardName) as Json[] });
const second = () => saved('deck-b', 9);
const third = () => saved('deck-c', 17);

function compare(decks = [second(), third()], rules = three, collection = snapshot()) {
  const result = checkCrownSeriesConflicts(rules, collection, main, decks);
  assert.equal(result.status, 'compared');
  return result;
}

describe('Crown Series base-card conflicts', () => {
  it('counts 24 or 32 distinct cards in the selected eight-slot format', () => {
    for (const rules of [three, four]) {
      const decks = [second(), third()];
      if (rules === four) decks.push(saved('deck-d', 25));
      const result = compare(decks, rules);
      assert.equal(result.rules, rules);
      assert.equal(result.asOf, at);
      assert.equal(result.filledSlots, decks.length * 8 + 8);
      assert.equal(result.uniqueCards, result.filledSlots);
      assert.deepEqual([result.withinDeck, result.acrossDecks, result.unresolved], [[], [], []]);
    }
  });

  it('locates the shared card by original deck and slot; an evolved card uses its base ID', () => {
    for (const id of [2, 3]) {
      const b = second();
      b.cards[7] = cardName(id);
      const result = compare([b, third()]);
      assert.equal(result.filledSlots, 24);
      assert.equal(result.uniqueCards, 23);
      assert.deepEqual(result.withinDeck, []);
      assert.deepEqual(result.acrossDecks, [{ cardId: id, name: cardName(id), locations: [
        { deckNumber: 1, savedDeckId: null, slot: id, reference: id },
        { deckNumber: 2, savedDeckId: 'deck-b', slot: 8, reference: cardName(id) },
      ] }]);
    }
  });

  it('separates repetition within one deck from a card shared across decks', () => {
    const b = second();
    b.cards[5] = 9;
    const local = compare([b, third()]);
    assert.deepEqual(local.acrossDecks, []);
    assert.deepEqual(local.withinDeck[0].locations.map(s => [s.deckNumber, s.slot]), [[2, 1], [2, 6]]);
    const c = third();
    c.cards[2] = cardName(9);
    const mixed = compare([b, c]);
    assert.deepEqual(mixed.withinDeck, local.withinDeck);
    assert.deepEqual(mixed.acrossDecks[0].locations.map(s => [s.deckNumber, s.slot]), [[2, 1], [2, 6], [3, 3]]);
  });

  it('keeps an unrecognized original name alongside a confirmed overlap; partial counts are explicit', () => {
    const b = second(), c = third();
    b.cards[7] = 'Retired name';
    c.cards[4] = 'Rage';
    const result = compare([b, c]);
    assert.equal(result.filledSlots, 24);
    assert.equal(result.uniqueCards, null);
    assert.equal(result.knownUniqueCards, 22);
    assert.deepEqual(result.unresolved, [{ deckNumber: 2, savedDeckId: b.id, slot: 8, reference: 'Retired name', reason: 'unrecognized' }]);
    assert.deepEqual(result.acrossDecks[0].locations.map(s => [s.deckNumber, s.slot]), [[1, 2], [3, 5]]);
  });

  it('recomputes the entire set after editing a saved deck without changing the pinned deck or prior result', () => {
    const b = second(), c = third();
    b.cards[7] = 'Rage';
    c.cards[3] = cardName(9);
    const original = structuredClone(main);
    const before = compare([b, c]);
    const after = compare([second(), c]);
    assert.deepEqual(before.acrossDecks.map(g => g.name), ['Rage', cardName(9)]);
    assert.deepEqual(after.acrossDecks.map(g => g.name), [cardName(9)]);
    assert.deepEqual(main, original);
    assert.equal(b.cards[7], 'Rage');
    assert.equal(after.uniqueCards, 23);
  });

  it('keeps shared upgrades valid in FEAT02 and does not apply Crown rules to a two-player set', () => {
    const collection = snapshot(), b = second();
    b.cards[7] = 'Rage';
    const upgrade = calculateDeckUpgradePlan(collection, { cards: ids(1), targetLevel: 13 },
      { cards: b.cards.map(String), targetLevel: 14 });
    assert.equal(upgrade.status, 'ready');
    assert.equal(upgrade.rows.find(row => row.name === 'Rage')?.sharedNextUpgrade, true);
    assert.equal(checkCrownSeriesConflicts('2v2', collection, main, [b]).status, 'unsupported_rules');
  });

  it('isolates the account, selected player, and completed collection during a player switch', () => {
    const collection = snapshot(), b = second(), c = third();
    b.cards[0] = 'Other player only';
    collection.cards.push({ ...collection.cards[0], player_tag: 'PPP', card_name: 'Other player only' });
    collection.cards.push({ ...collection.cards[0], user_id: 'another-account', card_name: 'Other player only' });
    assert.deepEqual(compare([b, c], three, collection).unresolved.map(s => s.reference), ['Other player only']);
    assert.equal(checkCrownSeriesConflicts(three, { ...collection, playerTag: '#PPP' }, main, [b, c]).status, 'scope_mismatch');
    assert.equal(checkCrownSeriesConflicts(three, { ...collection, playerTag: '#PPP' }, { ...main, tag: '#PPP' }, [b, c]).status, 'collection_unavailable');
    assert.equal(checkCrownSeriesConflicts(three, collection, main, [{ ...b, user_id: 'another-account' }, c]).status, 'scope_mismatch');
  });

  it('preserves ambiguous, malformed and missing slots and never guesses an alias or form', () => {
    const collection = snapshot(), b = second();
    collection.cards[31].card_name = 'Knight';
    b.cards[1] = 'Knight';
    b.cards[2] = { name: 'Rage', id: 2 };
    b.cards[3] = 'Knight Evolution';
    b.cards.pop();
    const malformedMain = structuredClone(main);
    Object.assign(malformedMain.currentDeck[0], { id: 'Rage' });
    const result = checkCrownSeriesConflicts(three, collection, malformedMain, [b, third()]);
    assert.equal(result.status, 'compared');
    assert.deepEqual(result.unresolved.map(s => [s.slot, s.reference, s.reason]), [
      [1, 'Rage', 'unrecognized'],
      [2, 'Knight', 'ambiguous'], [3, { name: 'Rage', id: 2 }, 'unrecognized'],
      [4, 'Knight Evolution', 'unrecognized'], [8, null, 'empty'],
    ]);
    assert.equal(result.filledSlots, 23);
    assert.equal(result.uniqueCards, null);
  });

  it('rejects repeated deck selections, mismatched formats and a ninth card', () => {
    const b = second(), c = third(), collection = snapshot();
    assert.equal(checkCrownSeriesConflicts(three, collection, main, [b, b]).status, 'invalid_selection');
    assert.equal(checkCrownSeriesConflicts(four, collection, main, [b, c]).status, 'invalid_selection');
    b.cards.push('Support');
    assert.deepEqual(checkCrownSeriesConflicts(three, collection, main, [b, c]), {
      status: 'invalid_deck_size', deckNumber: 2, savedDeckId: b.id,
    });
  });
});
