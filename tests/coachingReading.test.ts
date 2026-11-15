import assert from 'node:assert/strict';
import { it } from 'node:test';
import { coachingReading, readingText } from '../supabase/functions/_shared/coaching-reading';
import { swapStatement } from '../supabase/functions/_shared/coaching-advice';

const barbs = {id:1, name:'Barbarians', level:15, maxLevel:16};
const wizard = {id:2, name:'Wizard', level:12, maxLevel:14};
const original = {
  language:'tr', source_deck:[barbs], recommended_deck:[wizard],
  recommendation:{remove_id:1,add_id:2,reason:swapStatement(barbs,wizard,'tr'),practice:'Kulenden uzak oyna.',verified_swap:true,follow_up_verified:true,follow_up_language:'fr'},
  follow_up_question:'Où placer le Sorcier ?', follow_up_answer:swapStatement(barbs,wizard,'fr')+' Place le Sorcier en retrait.',
};

it('reads the French follow-up in Turkish without replacing the saved question, deck or levels', () => {
  const before = JSON.stringify(original);
  const reading = coachingReading(original,'tr')!;
  assert.deepEqual(reading.needed,{question:'Où placer le Sorcier ?',answer:'Place le Sorcier en retrait.'});
  assert.equal(readingText(reading).answer,'');
  assert.equal(readingText(reading).question,'');
  assert.equal(reading.facts,swapStatement(barbs,wizard,'tr'));
  const view = readingText(reading,{answer:'Büyücüyü geriye yerleştir.',question:'Büyücüyü nereye koymalıyım?'});
  assert.equal(view.practice,original.recommendation.practice);
  assert.equal(view.answer,'Büyücüyü geriye yerleştir.');
  assert.equal(JSON.stringify(original),before);
});

it('separates first advice from the follow-up across all five reading languages', () => {
  for (const lang of ['en','es','fr','pt','tr']) {
    const reading = coachingReading(original,lang)!;
    assert.equal('practice' in reading.needed, lang !== 'tr');
    assert.equal('answer' in reading.needed, lang !== 'fr');
    assert.equal('question' in reading.needed, lang !== 'fr');
    assert.equal(reading.facts,swapStatement(barbs,wizard,lang));
    assert.equal(reading.needed.reason,undefined);
  }
});

it('retains the previous protection for an unverified legacy card or level claim', () => {
  const old = {...original,recommendation:{...original.recommendation,verified_swap:false,reason:'Use Archers against air.'}};
  const reading = coachingReading(old,'es')!;
  assert.equal(reading.originals.reason,'');
  assert.equal(reading.needed.reason,undefined);
});
