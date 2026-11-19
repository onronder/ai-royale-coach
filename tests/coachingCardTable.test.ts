import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { coachingCard, coachingCardTable } from '../supabase/functions/_shared/coaching-advice';

describe('compact coaching card input', () => {
  it('preserves every candidate, order, identity, displayed level and elixir cost', () => {
    const cards = Array.from({ length: 120 }, (_, i) => ({
      id: 26000000 + i, name: `Card ${i}`, level: i % 10 + 1, maxLevel: 16, elixirCost: i % 10,
    }));
    const table = JSON.parse(JSON.stringify(coachingCardTable(cards)));
    const restored = table.rows.map((row: unknown[]) => Object.fromEntries(table.columns.map((key: string, i: number) => [key, row[i]])));
    assert.deepEqual(restored, cards.map(coachingCard));
    assert.ok(JSON.stringify(table).length < JSON.stringify(cards.map(coachingCard)).length * 0.7,
      'large collections should remove at least 30% of repeated JSON characters, not card data');
  });
  it('keeps unknown values distinct from zero and translates raw levels exactly once', () => {
    assert.deepEqual(coachingCardTable([
      { id: 1, name: 'Unknown', level: 0 },
      { id: 2, name: 'Zero elixir', level: 1, maxLevel: 16, elixirCost: 0 },
      { id: 3, name: 'Epic', level: 9, maxLevel: 11, elixirCost: 5 },
    ]).rows, [[1, 'Unknown', null, null], [2, 'Zero elixir', 1, 0], [3, 'Epic', 14, 5]]);
  });
  it('preserves names containing quotes, separators and non-English characters', () => {
    for (const name of ['P.E.K.K.A', 'Büyücü', 'Dragón eléctrico', 'Électro-dragon', 'Dragão Elétrico', 'A,"B"\nC']) {
      assert.equal(JSON.parse(JSON.stringify(coachingCardTable([{ id: 1, name, level: 1, maxLevel: 16 }]))).rows[0][1], name);
    }
  });
  it('never fills an empty collection or merges repeated entries', () => {
    assert.deepEqual(coachingCardTable([]).rows, []);
    const card = { id: 1, name: 'Knight', level: 1, maxLevel: 16 };
    assert.equal(coachingCardTable([card, card]).rows.length, 2);
  });
});
