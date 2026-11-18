import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { historyPlayerTag, prepareBattleWindow, ingestBattleWindow } from '../supabase/functions/_shared/battle-history';
import { clock, observedAt, historyBattle } from './fixtures/battleHistory';

const prepare = (rows: unknown, tag = 'P0LY') => prepareBattleWindow(tag, observedAt, rows, clock);
describe('observed battle contract', () => {
  it('normalizes tags but rejects unrelated identifiers', () => {
    assert.equal(historyPlayerTag(' #p0ly '), 'P0LY');
    for (const tag of ['', '#', 'email@example.com', 'ABC', null]) assert.throws(() => historyPlayerTag(tag));
  });
  it('keeps the actual battle date, separate from its observation', () => {
    const row = prepare([historyBattle('20261117T235900.000Z')]).rows[0];
    assert.equal(row.battle_at, '2026-11-17T23:59:00.000Z');
    assert.equal(row.key, 'v1|P0LY|2026-11-17T23:59:00.000Z|72000006|QQQQ');
  });
  it('uses card IDs and drops names, avatars and unrelated payload', () => {
    const b = historyBattle();
    const row = prepare([{ ...b, extra: 'sensitive' }]).rows[0];
    assert.ok(!JSON.stringify(row).includes('Private'));
    assert.ok(!JSON.stringify(row).includes('sensitive'));
    assert.equal(row.facts.own_cards[0].id, 26000000);
    assert.equal(row.facts.own_cards[0].elixir_cost, 3);
  });
  it('makes API order, deck order, localization and tag casing irrelevant', () => {
    const a = historyBattle(), b = historyBattle('20261118T110100.000Z');
    const changed = structuredClone(a);
    changed.team[0].tag = 'p0ly';
    changed.team[0].cards.reverse().forEach(c => { c.name = 'Çeviri'; });
    assert.deepEqual(prepare([a, b]), prepare([b, changed]));
  });
  it('keeps identity when score changes so conflicting evidence cannot create another battle', () => {
    const a = historyBattle(), b = historyBattle(); b.team[0].crowns = 3;
    const rows = prepare([a, b]).rows;
    assert.equal(rows[0].key, rows[1].key);
    assert.notDeepEqual(rows[0].facts, rows[1].facts);
  });
  it('does not confuse missing values with zero', () => {
    const b: any = historyBattle();
    delete b.team[0].trophyChange; delete b.team[0].crowns; delete b.team[0].cards[0].elixirCost;
    const f = prepare([b]).rows[0].facts;
    assert.equal(f.own_crowns, null); assert.equal(f.trophy_change, null); assert.equal(f.own_cards[0].elixir_cost, null);
    b.team[0].trophyChange = 0; b.team[0].crowns = 0; b.team[0].cards[0].elixirCost = 0;
    assert.equal(prepare([b]).rows[0].facts.trophy_change, 0);
    assert.equal(prepare([b]).rows[0].facts.own_cards[0].elixir_cost, 0);
  });
  it('keeps draw scores and does not calculate a win rate', () => {
    const b = historyBattle(); b.team[0].crowns = 2;
    assert.equal(prepare([b]).rows[0].facts.own_crowns, 2);
    assert.equal(prepare([b]).rows[0].facts.opponent_crowns, 2);
    assert.ok(!('win_rate' in prepare([b]).rows[0]));
  });
  it('does not accept coerced or out-of-range optional numbers', () => {
    const b: any = historyBattle(); b.team[0].crowns = '3'; b.team[0].trophyChange = 1.5; b.team[0].cards[0].level = -1;
    const f = prepare([b]).rows[0].facts;
    assert.equal(f.own_crowns, null); assert.equal(f.trophy_change, null); assert.equal(f.own_cards[0].level, null);
  });
  it('rejects wrong players, 2v2 and incomplete decks without losing valid rows', () => {
    const other = historyBattle(undefined, '#Q0LY'), duo = historyBattle(), short = historyBattle();
    duo.team.push({ ...duo.team[0], tag: '#Q0LY' }); short.team[0].cards.pop();
    const r = prepare([historyBattle(), other, duo, short]);
    assert.equal(r.rows.length, 1);
    assert.deepEqual(r.rejected, { wrong_player: 1, unsupported_participants: 1, invalid_deck: 1 });
  });
  it('rejects duplicate card IDs and absent mode identity', () => {
    const a: any = historyBattle(), b: any = historyBattle();
    a.team[0].cards[1].id = a.team[0].cards[0].id; delete b.gameMode.id;
    assert.deepEqual(prepare([a,b]).rejected, { invalid_deck: 1, missing_mode_id: 1 });
  });
  it('rejects rolled-over calendar dates and future battles', () => {
    const times = ['20260230T110000.000Z','20261118T256000.000Z','20261119T110000.000Z','invalid'];
    assert.deepEqual(prepare(times.map(t => historyBattle(t))).rejected, { invalid_battle_time: 4 });
  });
  it('accepts compact timestamps without fractional seconds', () => {
    assert.equal(prepare([historyBattle('20261118T110000Z')]).rows[0].battle_at, '2026-11-18T11:00:00.000Z');
  });
  it('retains mode distinctions without declaring unknown modes suitable for learning', () => {
    const b = historyBattle(); b.gameMode = { id: 72009999, name: 'New mode' }; b.deckSelection = 'draft';
    assert.equal(prepare([b]).rows[0].mode_id, 72009999);
    assert.equal(prepare([b]).rows[0].facts.deck_selection, 'draft');
  });
  it('bounds batches and rejects broken upstream responses instead of treating them as empty', () => {
    assert.throws(() => prepare({ error: 'maintenance' }), /invalid_battle_window/);
    assert.throws(() => prepare(Array.from({ length: 101 }, () => historyBattle())), /invalid_battle_window/);
    assert.throws(() => prepare([{ ...historyBattle(), extra: 'x'.repeat(512000) }]), /too_large/);
    assert.deepEqual(prepare([]), { version: 1, received: 0, rows: [], rejected: {} });
  });
  it('rejects invalid or future observation timestamps', () => {
    for (const ts of ['invalid', '2026-11-19T12:00:00.000Z']) assert.throws(() => prepareBattleWindow('P0LY', ts, [], clock));
  });
  it('skips stale cache without touching the store and preserves database errors', async () => {
    let calls = 0;
    const store = { rpc: async () => { calls++; return { data: null, error: { message: 'storage unavailable' } }; } };
    const input = { userId: 'fixture', playerTag: 'P0LY', fetchedAt: observedAt, battles: [historyBattle()], stale: true };
    assert.deepEqual(await ingestBattleWindow(store, input, clock), { status: 'stale_skipped' }); assert.equal(calls, 0);
    await assert.rejects(ingestBattleWindow(store, { ...input, stale: false }, clock), /storage unavailable/);
    assert.equal(calls, 1);
  });
});
