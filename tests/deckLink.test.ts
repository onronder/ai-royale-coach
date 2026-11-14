import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deckLink } from '../src/lib/deckLink';

const ids = [26000000, 26000018, 26000103, 26000063, 26000055, 26000035, 26000024, 26000023];
const cards = ids.map(id => ({ id }));

describe('coaching deck transfer', () => {
  it('keeps all eight cards in slot order using the in-game copy format', () => {
    assert.equal(deckLink(cards, 'tr'), 'https://link.clashroyale.com/tr/?clashroyale://copyDeck?deck=26000000;26000018;26000103;26000063;26000055;26000035;26000024;26000023;');
  });

  it('uses the revised deck when a follow-up replaces a card', () => {
    const revised = [...cards.slice(0, 6), { id: 26000043 }, cards[7]];
    assert.equal(deckLink(revised, 'en'), 'https://link.clashroyale.com/en/?clashroyale://copyDeck?deck=26000000;26000018;26000103;26000063;26000055;26000035;26000043;26000023;');
  });

  it('skips incomplete, duplicate or invalid cards', () => {
    assert.equal(deckLink([], 'tr'), null);
    assert.equal(deckLink(cards.slice(1), 'tr'), null);
    for (const id of [cards[0].id, 0, NaN, -1, 1.5]) {
      assert.equal(deckLink([...cards.slice(0, 7), { id }], 'tr'), null);
    }
  });
});
