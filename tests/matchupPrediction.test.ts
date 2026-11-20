import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMatchupPrediction } from '../supabase/functions/_shared/matchup-prediction';

const result = (deckAWinRate = 0, deckBWinRate = 100) => ({
  deckAWinRate, deckBWinRate, confidence: 'low', explanation: 'Heuristic estimate.',
  keyMatchups: [{ deckACard: 'Knight', deckBCard: 'Giant', advantage: 'even', reason: 'Depends on support.' }],
  tips: { forDeckA: ['Keep a defence ready.'], forDeckB: ['Avoid overcommitting.'] },
});

test('shared Oracle/server contract preserves zero and fractional valid percentages', () => {
  for (const [a,b] of [[0,100],[100,0],[50,50],[32.5,67.5]]) {
    const parsed = parseMatchupPrediction(result(a,b));
    assert.equal(parsed.deckAWinRate,a); assert.equal(parsed.deckBWinRate,b);
  }
});
test('normalizes only valid finite positive-total pairs', () => {
  const parsed = parseMatchupPrediction(result(60,30));
  assert.equal(parsed.deckAWinRate,67); assert.equal(parsed.deckBWinRate,33);
  for (const bad of [null, undefined, '0', NaN, Infinity, -1, 101]) {
    assert.throws(() => parseMatchupPrediction({ ...result(), deckAWinRate: bad }));
  }
  assert.throws(() => parseMatchupPrediction(result(0,0)));
});
test('wrong API field names or incomplete content cannot silently produce 50/50', () => {
  for (const bad of [null, [], {}, { predicted_win_rate_a: 0, predicted_win_rate_b: 100 },
    { ...result(), confidence: null }, { ...result(), explanation: {} },
    { ...result(), keyMatchups: [null] }, { ...result(), tips: { forDeckA: [{}], forDeckB: [] } }]) {
    assert.throws(() => parseMatchupPrediction(bad));
  }
});
