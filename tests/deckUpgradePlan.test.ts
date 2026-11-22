import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateDeckUpgradePlan } from '../src/lib/deckUpgradePlan';
import { nextUpgradeCopies, upgradeStep } from '../src/lib/upgradeCost';

const userId = 'fixture-account';
const playerTag = '#UY02YVY9G';
const sync = {
  user_id: userId, player_tag: playerTag, status: 'completed', synced_cards: 16,
  started_at: '2026-11-21T01:00:00.123400Z', last_successful_at: '2026-11-21T01:00:00.123499Z',
};
const mainIds = [1, 2, 3, 4, 5, 6, 7, 8];
const otherIds = [9, 10, 11, 12, 13, 14, 15, 16];
const goal = (cards: readonly (string | number)[], targetLevel: number) => ({ cards, targetLevel });
const card = (id: number, level = 16, owned: number | null = 0) => ({
  card_id: id, card_name: 'Epic ' + id, rarity: 'epic', card_level: level - 5, max_level: 11,
  card_count: owned, user_id: userId, player_tag: playerTag.slice(1), updated_at: '2026-11-21T01:00:00.123450Z',
});
const collection = (owned: number | null = 80) => ({
  userId, playerTag, sync, cards: [...mainIds, ...otherIds].map(id => id === 1 ? card(id, 12, owned) : card(id)),
});
const main = goal(mainIds, 13);
const second = goal(['Epic 1', ...otherIds.slice(1)], 14);

function ready(snapshot = collection(), first = main, next?: ReturnType<typeof goal>) {
  const plan = calculateDeckUpgradePlan(snapshot, first, next);
  assert.equal(plan.status, 'ready');
  return plan;
}

describe('deck upgrade plan', () => {
  it('prices one deck, then spends the shared stock once for the union and preserves the original plan', () => {
    const snapshot = collection();
    const single = ready(snapshot);
    const pair = ready(snapshot, main, second);
    assert.equal(single.rows.length, 8);
    assert.equal(pair.rows.length, 15);
    assert.equal(pair.rows.filter(r => r.cardId === 1).length, 1);
    const row = pair.rows[0];
    assert.equal(row.sharedNextUpgrade, true);
    assert.deepEqual(row.main, { copies: 70, missingCopies: 0, gold: 40000, knownGold: 40000 });
    assert.deepEqual(row.combined, { copies: 170, missingCopies: 90, gold: 100000, knownGold: 100000 });
    assert.deepEqual(row.additional, { copies: 100, missingCopies: 90, gold: 60000, knownGold: 60000 });
    assert.deepEqual(pair.gold, { main: { total: 40000, known: 40000 }, combined: { total: 100000, known: 100000 }, additional: { total: 60000, known: 60000 } });
    assert.deepEqual(ready(snapshot), single); // removing the second goal restores the same result
  });

  it('deduplicates reordered decks and returns zero extra for identical or lower targets, even with unknown stock', () => {
    for (const lower of [12, 13]) {
      const plan = ready(collection(null), main, goal([...mainIds].reverse(), lower));
      assert.equal(plan.rows.length, 8);
      assert.deepEqual(plan.gold.main, plan.gold.combined);
      assert.deepEqual(plan.gold.additional, { total: 0, known: 0 });
      assert(plan.rows.every(r => r.additional.copies === 0 && r.additional.missingCopies === 0));
      assert.equal(plan.rows[0].main.missingCopies, null);
      assert.equal(plan.rows[0].sharedNextUpgrade, lower === 13);
    }
  });

  it('adds disjoint decks without using a surplus from a different card', () => {
    const snapshot = collection(10000);
    snapshot.cards[8] = card(9, 13, 0);
    const plan = ready(snapshot, main, goal(otherIds, 14));
    assert.equal(plan.rows.length, 16);
    assert(plan.rows.every(row => !row.sharedNextUpgrade));
    assert.equal(plan.rows[8].additional.missingCopies, 100);
    assert.deepEqual(plan.gold.additional, ready(snapshot, goal(otherIds, 14)).gold.main);
    assert.equal(plan.gold.combined.total, 100000);
  });

  it('distinguishes unknown, zero, partial and excess stock without affecting gold', () => {
    for (const [owned, first, combined, extra] of [
      [null, null, null, null], [0, 70, 170, 100], [30, 40, 140, 100], [70, 0, 100, 100],
      [169, 0, 1, 1], [170, 0, 0, 0], [999, 0, 0, 0],
    ]) {
      const row = ready(collection(owned), main, second).rows[0];
      assert.deepEqual([row.main.missingCopies, row.combined.missingCopies, row.additional.missingCopies], [first, combined, extra]);
      assert.equal(row.additional.gold, 60000);
    }
  });

  it('keeps the combined plan symmetric and accounts for each priced step in either direction', () => {
    const snapshot = collection();
    snapshot.cards[9] = card(10, 12, 7);
    for (const mainLevel of [11, 12, 13, 15, 16]) {
      for (const secondLevel of [11, 12, 14, 15, 16]) {
        const a = goal(mainIds, mainLevel);
        const b = goal(second.cards, secondLevel);
        const forward = ready(snapshot, a, b);
        const reverse = ready(snapshot, b, a);
        assert.deepEqual(forward.gold.combined, reverse.gold.combined);
        assert.equal(forward.gold.main.total! + forward.gold.additional.total!, forward.gold.combined.total);
        for (const row of forward.rows) {
          assert.equal(row.main.missingCopies! + row.additional.missingCopies!, row.combined.missingCopies);
        }
      }
    }
  });

  it('updates the common next step after leveling up or reaching the maximum', () => {
    for (const level of [13, 14, 16]) {
      const snapshot = collection();
      snapshot.cards[0] = card(1, level, 10);
      const row = ready(snapshot, main, second).rows[0];
      assert.equal(row.level, level);
      assert.equal(row.sharedNextUpgrade, false);
      assert.equal(row.main.copies, 0);
      assert.equal(row.additional.missingCopies, level === 13 ? 90 : 0);
      assert.equal(row.additional.gold, level === 13 ? 60000 : 0);
    }
  });

  it('keeps a priced extra step exact when the primary plan includes an unpriced step', () => {
    const snapshot = collection();
    snapshot.cards[0] = card(1, 6, 1);
    snapshot.cards[8] = card(9, 13, 0);
    const plan = ready(snapshot, goal(mainIds, 7), goal(otherIds, 14));
    assert.deepEqual(plan.gold, { main: { total: null, known: 0 }, combined: { total: null, known: 60000 }, additional: { total: 60000, known: 60000 } });
    assert.equal(plan.rows[0].main.missingCopies, 1);
    const overlapping = ready(snapshot, goal(mainIds, 7), goal(mainIds, 8));
    assert.equal(overlapping.gold.combined.total, null);
    assert.equal(overlapping.gold.additional.total, 2000);
    assert.equal(overlapping.rows[0].additional.missingCopies, 4);
  });

  it('reports only the priced subtotal when the extra steps themselves include unknown gold', () => {
    const snapshot = collection();
    snapshot.cards[8] = card(9, 6, 0);
    snapshot.cards[9] = card(10, 13, 0);
    const plan = ready(snapshot, main, goal(otherIds, 14));
    const pricedEpicSteps = 2000 + 4000 + 8000 + 15000 + 25000 + 40000 + 60000;
    assert.deepEqual(plan.gold.additional, { total: null, known: pricedEpicSteps + 60000 });
    assert.equal(plan.rows[8].additional.missingCopies, 2 + 4 + 10 + 20 + 30 + 50 + 70 + 100);
    assert.equal(plan.rows[9].additional.gold, 60000);
  });

  it('treats a malformed permanent level as unknown and a verified maximum as completed', () => {
    for (const [raw, max] of [[0, 0], [12, 11]]) {
      const snapshot = collection();
      Object.assign(snapshot.cards[0], { card_level: raw, max_level: max });
      const row = ready(snapshot, main, goal(mainIds, 13)).rows[0];
      assert.equal(row.level, null);
      assert.equal(row.main.gold, null);
      assert.equal(row.combined.missingCopies, null);
      assert.equal(row.additional.gold, 0);
      assert.equal(row.sharedNextUpgrade, null);
      assert.equal(ready(snapshot, main, goal(mainIds, 13)).sharedNextUpgrade, null);
      assert.equal(ready(snapshot).rows[0].sharedNextUpgrade, false);
      assert.equal(ready(snapshot, main, goal(otherIds, 14)).sharedNextUpgrade, false);
      snapshot.cards[1] = card(2, 12);
      assert.equal(ready(snapshot, main, goal(mainIds, 13)).sharedNextUpgrade, true);
    }
    assert.equal(ready().rows[1].level, 16);
  });

  it('prices raw names, IDs and historical API cards in the same order using only verified stock and levels', () => {
    const snapshot = collection();
    const ids = [1, ...otherIds.slice(0, 7)];
    const records = ids.map(id => ({ id, name: 'Epic ' + id, count: 90000, level: 1 }));
    const expected = ready(snapshot, main, goal(ids, 14));
    for (const refs of [records, records.map(c => c.name), [records[0], ids[1], ...records.slice(2)]]) {
      const result = calculateDeckUpgradePlan(snapshot, main, { cards: refs, targetLevel: 14 });
      assert.deepEqual(result, expected);
    }
    assert.deepEqual(expected.secondCardIds, ids);
    assert.deepEqual([expected.gold.main.total, expected.gold.additional.total, expected.gold.combined.total], [40000, 60000, 100000]);
    assert.equal(expected.rows[0].additional.missingCopies, 90);
  });

  it('retains the main plan and pinpoints a conflicting ID and known name without guessing', () => {
    const snapshot = collection();
    for (const slot of [0, 3, 7]) {
      const cards = otherIds.map(id => ({ id, name: 'Epic ' + id }));
      cards[slot] = { id: cards[slot].id, name: 'Epic 1' };
      const result = calculateDeckUpgradePlan(snapshot, main, { cards, targetLevel: 14 });
      assert.equal(result.status, 'invalid');
      assert.equal(result.error, 'unresolved_card');
      assert.equal(result.slot, slot);
      assert.equal(result.reference, 'Epic 1');
      assert.equal(result.mainPlan.gold.total, 40000);
    }
  });

  it('never prices fewer than eight unique identified cards or an invalid target', () => {
    const snap = collection();
    const run = (g: ReturnType<typeof goal>) => calculateDeckUpgradePlan(snap, main, g);
    assert.equal(run(goal(mainIds.slice(1), 14)).error, 'invalid_size');
    assert.equal(run(goal([...mainIds, 9], 14)).error, 'invalid_size');
    assert.equal(run(goal([...mainIds.slice(1), 'Epic 8'], 14)).error, 'duplicate_card');
    for (const target of [0, 17, 13.5, NaN]) assert.equal(run(goal(mainIds, target)).error, 'invalid_target');
    const missing = goal([...mainIds.slice(1), 'Missing card'], 14);
    const partial = run(missing);
    assert.equal(partial.status, 'invalid');
    assert.equal(partial.deck, 'second');
    assert.equal(partial.error, 'unresolved_card');
    assert.equal(partial.slot, 7);
    assert.equal(partial.reference, 'Missing card');
    const single = ready(snap);
    assert.deepEqual(partial.mainPlan, { rows: single.rows, gold: single.gold.main });
    assert.equal(partial.asOf, sync.last_successful_at);
    assert.equal('gold' in partial, false); // no combined or incremental price
    snap.cards[1].card_name = 'Epic 1';
    assert.equal(run(second).error, 'unresolved_card');
  });

  it('uses only the selected player, account and completed run at full timestamp precision', () => {
    const snap = collection();
    const base = snap.cards[0];
    snap.cards.unshift(
      { ...base, card_count: 0, player_tag: '#QQQ' }, { ...base, card_count: 0, user_id: 'other' },
      { ...base, card_count: 0, updated_at: '2026-11-21T01:00:00.123399Z' },
    );
    assert.equal(ready(snap, main, second).rows[0].additional.missingCopies, 90);
    for (const syncState of [{ ...sync, status: 'failed' }, { ...sync, user_id: 'other' }, { ...sync, player_tag: '#QQQ' }]) {
      assert.equal(calculateDeckUpgradePlan({ ...snap, sync: syncState }, main).status, 'unavailable');
    }
    const other = { ...snap, playerTag: '#QQQ', sync: { ...sync, player_tag: '#QQQ' }, cards: collection(0).cards.map(c => ({ ...c, player_tag: '#QQQ' })) };
    assert.equal(ready(other, main, second).rows[0].additional.missingCopies, 100);
  });

  it('waits for both reads and the full distinct card count before resolving any deck slots', () => {
    const old = collection(0);
    const newer = {
      ...sync, started_at: '2026-11-21T02:00:00.000001Z', last_successful_at: '2026-11-21T02:00:00.000003Z',
    };
    const newCards = collection(80).cards.map(c => ({ ...c, updated_at: newer.last_successful_at }));
    const run = (cards: typeof newCards, op = newer) =>
      calculateDeckUpgradePlan({ ...old, sync: op, cards }, main, second);
    for (const cards of [old.cards, newCards.slice(0, 8), [...newCards.slice(1), newCards[1]]]) {
      assert.equal(run(cards).status, 'waiting');
    }
    assert.equal(run(newCards, sync).status, 'waiting'); // rows arrived before operation
    assert.equal(run([...old.cards, { ...newCards[0], card_id: 99 }], sync).status, 'waiting');
    assert.equal(calculateDeckUpgradePlan({ ...old, sync: null }, main).status, 'waiting');
    const current = run(newCards);
    assert.equal(current.status, 'ready');
    assert.equal(current.asOf, newer.last_successful_at);
    assert.equal(current.freshness, 'current');
    assert.equal(current.rows[0].additional.missingCopies, 90);
  });

  it('reuses a verified earlier collection with its own date while refreshing or after failure', () => {
    const previous = collection(0);
    const fresh = collection(80);
    const newer = {
      ...sync, started_at: '2026-11-22T02:00:00Z', last_successful_at: '2026-11-22T02:00:01Z',
    };
    const currentCards = fresh.cards.map(c => ({ ...c, updated_at: newer.last_successful_at }));
    for (const status of ['running', 'failed', 'cancelled', 'completed']) {
      const progress = status === 'completed' ? newer : { ...newer, status, synced_cards: null, last_successful_at: sync.last_successful_at };
      const input = { ...fresh, sync: progress, cards: previous.cards, previous };
      const plan = calculateDeckUpgradePlan(input, main, second);
      assert.equal(plan.status, 'ready');
      assert.equal(plan.freshness, 'previous');
      assert.equal(plan.asOf, sync.last_successful_at);
      assert.equal(plan.rows[0].additional.missingCopies, 100);
      const withoutCurrentCard = status === 'failed' || status === 'cancelled' ? 'unavailable' : 'waiting';
      assert.equal(calculateDeckUpgradePlan(input, goal(['new card', ...mainIds.slice(1)], 13)).status, withoutCurrentCard);
      const partial = calculateDeckUpgradePlan(input, main, goal([...mainIds.slice(1), 'new card'], 14));
      assert.equal(partial.status, withoutCurrentCard);
      assert.equal(partial.mainPlan.gold.total, 40000);
      assert.equal('error' in partial, false);
    }
    const current = calculateDeckUpgradePlan({ ...fresh, sync: newer, cards: currentCards, previous }, main, second);
    assert.equal(current.freshness, 'current');
    assert.equal(current.asOf, newer.last_successful_at);
    assert.equal(current.rows[0].additional.missingCopies, 90);
    const delayed = calculateDeckUpgradePlan({
      ...previous, previous: { sync: newer, cards: currentCards },
    }, main, second);
    assert.equal(delayed.asOf, newer.last_successful_at);
    assert.equal(delayed.rows[0].additional.missingCopies, 90);
  });

  for (const [deck, missingId] of [['main', 8], ['second', 16]] as const) {
    it('keeps the verified missing slot in the ' + deck + ' deck when an older response arrives late', () => {
      const older = collection(0);
      const end = '2026-11-21T01:00:00.123599Z';
      const newer = {
        ...collection(80),
        sync: { ...sync, started_at: '2026-11-21T01:00:00.123500Z', last_successful_at: end, synced_cards: 15 },
        cards: collection(80).cards.filter(c => c.card_id !== missingId).map(c => ({ ...c, updated_at: end })),
      };
      const expected = calculateDeckUpgradePlan({ ...newer, previous: older }, main, second);
      assert.equal(expected.status, 'invalid');
      assert.equal(expected.deck, deck);
      assert.equal(expected.error, 'unresolved_card');
      assert.equal(expected.slot, 7);
      assert.equal(expected.reference, missingId);
      assert.equal(expected.asOf, end);
      assert.equal(expected.freshness, 'current');
      if (expected.deck === 'second') assert.equal(expected.mainPlan.gold.total, 40000);

      // Metadata and rows can arrive separately, including from the older request.
      for (const incoming of [older, { ...older, cards: newer.cards }, { ...newer, cards: older.cards }]) {
        assert.deepEqual(calculateDeckUpgradePlan({ ...incoming, previous: newer }, main, second), expected);
      }
      const future = '2026-11-21T01:00:00.123699Z';
      for (const pending of [
        { ...newer, sync: { ...newer.sync, started_at: '2026-11-21T01:00:00.123600Z', last_successful_at: future } },
        { ...older, cards: newer.cards.map(c => ({ ...c, updated_at: future })) },
      ]) {
        const result = calculateDeckUpgradePlan({ ...pending, previous: newer }, main, second);
        assert.equal(result.status, 'waiting');
        assert.equal(result.freshness, 'previous');
        assert.equal(result.asOf, end);
        assert.equal('slot' in result, false);
        if (deck === 'second') assert.equal(result.mainPlan?.gold.total, 40000);
      }
    });
  }

  it('never reuses an incomplete collection or one verified for another account or player', () => {
    const saved = collection();
    for (const previous of [
      { ...saved, cards: saved.cards.slice(0, 8) }, { ...saved, sync: { ...sync, synced_cards: null } },
      { ...saved, sync: { ...sync, user_id: 'another-account' } }, { ...saved, sync: { ...sync, player_tag: '#QQQ' } },
    ]) {
      const result = calculateDeckUpgradePlan({ ...saved, sync: { ...sync, status: 'failed' }, previous }, main);
      assert.equal(result.status, 'unavailable');
      assert.equal('asOf' in result, false);
    }
  });

  it('uses the same 50 legal copy steps as Collection, including rarity-specific gold', () => {
    for (const [rarity, first, expected] of [
      ['common', 1, [2,4,10,20,50,100,200,400,800,1000,1500,2500,3500,5500,7500]],
      ['rare', 3, [2,4,10,20,50,100,200,300,400,550,750,1000,1400]],
      ['epic', 6, [2,4,10,20,30,50,70,100,130,180]],
      ['legendary', 9, [2,4,6,9,12,14,20]], ['champion', 11, [2,5,8,11,15]],
    ] as const) {
      for (const [index, copies] of expected.entries()) {
        const target = first + index + 1;
        const standardGold = [0,0,5,20,50,150,400,1000,2000,4000,8000,15000,25000,40000,60000,90000,120000][target];
        const gold = rarity === 'epic' && target === 7 ? null : rarity === 'legendary' && target === 10 ? 5000 : standardGold;
        assert.deepEqual(upgradeStep(rarity, target), [copies, gold]);
        assert.equal(nextUpgradeCopies({ rarity, card_level: index + 1, max_level: 17 - first }), copies);
      }
      assert.equal(upgradeStep(rarity, first), null);
    }
  });
});
