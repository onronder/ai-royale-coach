import assert from 'node:assert/strict';
import { it } from 'node:test';
import { baseLanguage, productLanguage } from '../supabase/functions/_shared/language';
import { localizedCardName } from '../supabase/functions/_shared/card-names';
import { formatCoachingAdvice } from '../supabase/functions/_shared/coaching-advice';
import { recommendationReasons } from '../supabase/functions/_shared/recommendation-reasons';

it('resolves regional browser, email and AI language codes without discarding the next browser preference', () => {
  for (const [input, expected] of [['tr-TR', 'tr'], ['pt_BR', 'pt'], [' ES-mx ', 'es'], ['fr-CA', 'fr'], ['en-GB', 'en']]) {
    assert.equal(baseLanguage(input), expected);
    assert.equal(productLanguage(input), expected);
  }
  assert.equal(baseLanguage('de-CH'), 'de');
  for (const value of [null, '', {}, 'zz', '__proto__']) assert.equal(productLanguage(value), 'en');
});

it('keeps unknown card names and localizes known cards consistently across the tile, swap and tactical text', () => {
  const old = { id: 26000001, name: 'Archers', level: 7, maxLevel: 16 };
  const next = { id: 28000001, name: 'Arrows', level: 5, maxLevel: 16 };
  const names = { en: 'Arrows', tr: 'Oklar', es: 'Flechas', fr: 'Flèches', pt: 'Flechas' } as const;
  for (const lang of Object.keys(names) as Array<keyof typeof names>) {
    assert.equal(localizedCardName(next.name, lang), names[lang]);
    assert.equal(localizedCardName('Future card', lang), 'Future card');
    const advice = formatCoachingAdvice(old, next, [old, next], lang, null, '{card}', '{card}');
    assert.ok(advice.reason.includes(names[lang]));
    assert.equal(advice.practice, names[lang]);
    assert.ok(advice.answer?.includes(names[lang]));
    assert.ok(recommendationReasons[lang].style('Cycle').includes('Cycle'));
  }
  assert.equal(localizedCardName('Mini P.E.K.K.A.', 'fr-FR'), localizedCardName('Mini P.E.K.K.A', 'fr'));
  assert.equal(next.name, 'Arrows');
});
