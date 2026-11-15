import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deliverSummary, summaryEmail, type SummaryTask } from '../supabase/functions/trial-coaching-summary/summary';

const deck = (ids: number[]) => ids.map(id => ({ id, name: 'Card' + id, level: 11, maxLevel: 14, iconUrls: { medium: '' } }));
const base: SummaryTask = {
  id: 't1', language: 'en', source_deck: deck([1,2,3,4,5,6,7,8]) as never, recommended_deck: deck([9,2,3,4,5,6,7,8]) as never,
  recommendation: { remove_id: 1, add_id: 9, reason: 'Reason.', practice: 'Practice.', language: 'en', follow_up_language: 'en' },
  follow_up_question: 'Why?', follow_up_answer: 'Because it works.', battle_result: null, previous_match: null,
};

describe('end-of-trial coaching summary', () => {
  for (const [lang, none] of [['en','No matching match found.'],['tr','Eşleşen maç bulunamadı.'],['es','No se encontró ninguna partida coincidente.'],['fr','Aucun match correspondant trouvé.'],['pt','Nenhuma partida correspondente encontrada.']]) {
    it('says no matching match in ' + lang, () => {
      const mail = summaryEmail(base, 'UY02YVY9G', lang)!;
      assert.ok(mail.text.includes(none));
      assert.match(mail.text, /select-player\?coaching=UY02YVY9G/);
    });
  }
  it('shows score and trophy change of the matching match', () => {
    const mail = summaryEmail({ ...base, battle_result: { outcome: 'loss', score: [1, 3], trophy_change: -29 } }, 'P', 'en')!;
    assert.match(mail.text, /1 – 3 · Defeat · -29 trophies/);
  });
  it('omits an English coach answer from a Turkish email without a saved translation', () => {
    assert.ok(!summaryEmail(base, 'P', 'tr')!.text.includes('Because it works.'));
    assert.ok(summaryEmail(base, 'P', 'en')!.text.includes('Because it works.'));
  });
  it('rejects malformed requests', async () => {
    const fail = async () => assert.fail();
    const store = { claim: fail, freeze: fail, begin: fail, release: fail, record: fail } as never;
    const provider = { send: fail, findAccepted: fail } as never;
    const reads = { task: fail, translation: fail } as never;
    assert.equal((await deliverSummary(new Request('https://w.invalid', { method: 'POST', body: '{"ticket":"x"}' }), store, provider, reads)).status, 400);
  });
});
