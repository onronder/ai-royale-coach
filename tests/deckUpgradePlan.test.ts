import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateDeckUpgradePlan } from '../src/lib/deckUpgradePlan';
import { nextUpgradeCopies, upgradeStep } from '../src/lib/upgradeCost';

const userId = 'fixture-account';
const playerTag = '#UY02YVY9G';
const sync = {
  user_id: userId, player_tag: playerTag, status: 'completed',
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
      assert.equal(row.sharedNextUpgrade, false);
    }
    assert.equal(ready().rows[1].level, 16);
  });

  it('never prices fewer than eight unique identified cards or an invalid target', () => {
    const snap = collection();
    const run = (g: ReturnType<typeof goal>) => calculateDeckUpgradePlan(snap, main, g);
    assert.equal(run(goal(mainIds.slice(1), 14)).error, 'invalid_size');
    assert.equal(run(goal([...mainIds, 9], 14)).error, 'invalid_size');
    assert.equal(run(goal([...mainIds.slice(1), 'Epic 8'], 14)).error, 'duplicate_card');
    for (const target of [0, 17, 13.5, NaN]) assert.equal(run(goal(mainIds, target)).error, 'invalid_target');
    const missing = goal([...mainIds.slice(1), 'Missing card'], 14);
    assert.deepEqual(run(missing), { status: 'invalid', deck: 'second', error: 'unresolved_card', slot: 7, reference: 'Missing card' });
    snap.cards[1].card_name = 'Epic 1';
    assert.equal(run(second).error, 'unresolved_card');
  });

  it('uses only the selected player, account and completed run at full timestamp precision', () => {
    const snap = collection();
    const base = snap.cards[0];
    snap.cards.unshift(
      { ...base, card_count: 0, player_tag: '#QQQ' }, { ...base, card_count: 0, user_id: 'other' },
      { ...base, card_count: 0, updated_at: '2026-11-21T01:00:00.123399Z' },
      { ...base, card_count: 0, updated_at: '2026-11-21T01:00:00.123500Z' },
    );
    assert.equal(ready(snap, main, second).rows[0].additional.missingCopies, 90);
    for (const syncState of [null, { ...sync, status: 'failed' }, { ...sync, user_id: 'other' }, { ...sync, player_tag: '#QQQ' }]) {
      assert.equal(calculateDeckUpgradePlan({ ...snap, sync: syncState }, main).status, 'unavailable');
    }
    const other = { ...snap, playerTag: '#QQQ', sync: { ...sync, player_tag: '#QQQ' }, cards: collection(0).cards.map(c => ({ ...c, player_tag: '#QQQ' })) };
    assert.equal(ready(other, main, second).rows[0].additional.missingCopies, 100);
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
