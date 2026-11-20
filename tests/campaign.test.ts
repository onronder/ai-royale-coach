import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BLACK_FRIDAY, isBlackFridayActive } from '../src/lib/campaign';

describe('Black Friday campaign window', () => {
  it('is active at 30 Nov 23:59 Istanbul', () => {
    assert.equal(isBlackFridayActive(Date.parse('2026-11-30T23:59:00+03:00')), true);
  });
  it('ends at 1 Dec 00:00 Istanbul', () => {
    assert.equal(isBlackFridayActive(Date.parse('2026-12-01T00:00:00+03:00')), false);
  });
  it('uses code BLACKROYALE75 for 75% off', () => {
    assert.equal(BLACK_FRIDAY.code, 'BLACKROYALE75');
    assert.equal(BLACK_FRIDAY.percent, 75);
  });
});
