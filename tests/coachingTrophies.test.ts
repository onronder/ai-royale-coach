import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { latestLadderTrophies } from '../supabase/functions/_shared/coaching-match';
import { withBattleTrophies, withRecentLadderTrophies } from '../src/lib/battleTrophies';

const ladder = (time: string, before?: number, change?: number) => ({
  type: 'PvP', gameMode: { name: 'Ladder' }, battleTime: time,
  team: [{ tag: '#P0LY', crowns: 3, cards: [], startingTrophies: before, trophyChange: change }], opponent: [{ tag: "#QQL", crowns: 0, cards: [] }],
});
const win = ladder('20261114T204800.000Z', 6629, 30);
const loss = ladder('20261114T210000.000Z', 6659, -28);

describe('trophies after a coaching match', () => {
  it('takes the latest ladder total and ignores event battles and other players', () => {
    const event = { ...loss, gameMode: { name: 'Challenge' } };
    const foreign = { ...loss, team: [{ ...loss.team[0], tag: '#QQQQ' }] };
    assert.deepEqual(latestLadderTrophies('p0ly', [event, foreign, win]), { before: 6629, after: 6659 });
    assert.deepEqual(latestLadderTrophies('p0ly', [win, loss]), { before: 6659, after: 6631 });
  });
  it('does not infer an absolute total from a delta or an older battle', () => {
    assert.equal(latestLadderTrophies('P0LY', [win, ladder(loss.battleTime, undefined, 30)]), null);
    assert.equal(latestLadderTrophies('P0LY', [ladder(loss.battleTime, 6629)]), null);
  });
  it('reconciles a newly opened dashboard with the recent ladder log and ignores outdated battles', () => {
    const profile = { tag: '#P0LY', trophies: 666, bestTrophies: 666 };
    const battle = ladder('20261114T232948.000Z', 666, 30);
    const opened = Date.parse('2026-11-14T23:31:00Z');
    const current = withRecentLadderTrophies(profile, [battle], opened);
    assert.deepEqual(current, { ...profile, trophies: 696, bestTrophies: 696 });
    assert.equal(withRecentLadderTrophies(current, [battle], opened), current);
    assert.equal(withRecentLadderTrophies(profile, [battle], opened + 300_000), profile);
    assert.equal(withRecentLadderTrophies(profile, [], opened), profile);
  });
  it('sets the absolute score once, preserves newer totals and updates the personal best', () => {
    const before = { trophies: 6629, bestTrophies: 6658 };
    const snapshot = { before: 6629, after: 6659 };
    const after = withBattleTrophies(before, snapshot);
    assert.deepEqual(after, { trophies: 6659, bestTrophies: 6659 });
    assert.equal(withBattleTrophies(after, snapshot), after);
    const newer = { trophies: 6631, bestTrophies: 6659 };
    assert.equal(withBattleTrophies(newer, snapshot), newer);
    assert.equal(withBattleTrophies(before), before);
  });
});
