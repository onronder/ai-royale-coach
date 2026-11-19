import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../drizzle/migrations/', import.meta.url);
const entries = JSON.parse(readFileSync(new URL('meta/_journal.json', root), 'utf8')).entries as
  { idx: number; tag: string; when: number }[];

test('every SQL migration is registered exactly once and in file order', () => {
  const files = readdirSync(root).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort();
  assert.deepEqual(entries.map(e => e.tag + '.sql'), files);
  assert.equal(new Set(files.map(f => f.slice(0, 4))).size, files.length);
});

test('journal indexes and timestamps cannot skip or reorder a migration', () => {
  entries.forEach((entry, i) => {
    assert.equal(entry.idx, i);
    assert.equal(Number(entry.tag.slice(0, 4)), i);
    assert(Number.isSafeInteger(entry.when));
    if (i > 0) assert(entry.when > entries[i - 1].when);
  });
});
