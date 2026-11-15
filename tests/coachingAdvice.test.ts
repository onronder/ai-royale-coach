import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { coachingCard, coachingSwap, formatCoachingAdvice, swapStatement, tacticalText } from '../supabase/functions/_shared/coaching-advice';
import { getDisplayLevel } from '../src/utils/cardLevelCalculator';

const dragon = { id: 26000063, name: 'Electro Dragon', level: 9, maxLevel: 11 };
const archers = { id: 26000001, name: 'Archers', level: 11, maxLevel: 16 };
const wizard = { id: 26000017, name: 'Wizard', level: 13, maxLevel: 14 };
const knight = { id: 26000000, name: 'Knight', level: 15, maxLevel: 16 };
const collection = [dragon, archers, wizard, knight];

describe('coaching swap and card levels', () => {
  it('supplies the game level to the model and the card tile without leaking the raw level', () => {
    for (const [card, expected] of [[dragon, 14], [wizard, 15], [archers, 11]] as const) {
      assert.equal(coachingCard(card).displayLevel, expected);
      assert.equal(getDisplayLevel(card), expected);
      assert.ok(!('level' in coachingCard(card)));
    }
  });
  it('keeps the outgoing card from the original deck when replacing a previous suggestion', () => {
    const original = [dragon, knight];
    assert.deepEqual(coachingSwap(original, [archers, knight], dragon.id), { removed: dragon, added: archers });
    assert.deepEqual(coachingSwap(original, [wizard, knight], dragon.id), { removed: dragon, added: wizard });
    assert.equal(coachingSwap(original, [wizard, archers], dragon.id), null);
  });
  it('rejects the observed wrong swap and level in both initial and follow-up prose', () => {
    const bad = 'Archers yerine 13. seviye Wizard kullanabilirsin.';
    const advice = formatCoachingAdvice(dragon, wizard, collection, 'tr', bad, bad, bad);
    assert.equal(advice.reason, 'Elektro Ejderha (seviye 14) yerine Büyücü (seviye 15) kullan.');
    assert.equal(advice.answer, advice.reason);
    assert.ok(!advice.practice.includes('Archers'));
    assert.equal(tacticalText('Archers yerine savunmada kullan.', wizard, collection), '');
  });
  it('preserves tactical answers and inserts the chosen card name from the collection', () => {
    const advice = formatCoachingAdvice(dragon, wizard, collection, 'en', 'Use splash damage on defense.',
      'Place {card} behind your tank.', 'Keep {card} out of spell range.');
    assert.equal(advice.practice, 'Place Wizard behind your tank.');
    assert.match(advice.answer!, /Keep Wizard out of spell range/);
    for (const [lang, from, to] of [['en', 'Electro Dragon', 'Wizard'], ['fr', 'Électro-dragon', 'Sorcier'], ['es', 'Dragón eléctrico', 'Mago'], ['pt', 'Dragão Elétrico', 'Mago'], ['tr-TR', 'Elektro Ejderha', 'Büyücü']]) {
      const statement = swapStatement(dragon, wizard, lang);
      for (const token of [from, '14', to, '15']) assert.ok(statement.includes(token));
    }
  });
});
