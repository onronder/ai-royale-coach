import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deliverSummary, summaryEmail, type Summary, type SummaryTask } from '../supabase/functions/trial-coaching-summary/summary';

const deck = (ids: number[]) => ids.map(id => ({ id, name: 'Card' + id, level: 11, maxLevel: 14, iconUrls: { medium: '' } }));
const base: SummaryTask = {
  id: 't1', language: 'en', source_deck: deck([1,2,3,4,5,6,7,8]) as never, recommended_deck: deck([9,2,3,4,5,6,7,8]) as never,
  recommendation: { remove_id: 1, add_id: 9, reason: 'Reason.', practice: 'Practice.', language: 'en', follow_up_language: 'en' },
  follow_up_question: 'Why?', follow_up_answer: 'Because it works.', battle_result: null, previous_match: null,
};
const ticket = '44dd2c00-eae7-4ea1-8865-b7510387d350';
const row: Summary = { user_id: 'u', subscription_id: 'sub-1', task_id: 't1', player_tag: 'UY02YVY9G', language: 'en', email: 'x@example.invalid' };
const req = () => new Request('https://w.invalid', { method: 'POST', body: JSON.stringify({ ticket }) });

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
  it('sends once, stores the message id and reuses the subscription key on retry', async () => {
    const keys: string[] = []; const ids: string[] = [];
    const d = { take: async () => row, task: async () => base, translation: async () => undefined,
      send: async (_: unknown, k: string) => { keys.push(k); return 're_1'; },
      markSent: async (_: Summary, id: string) => { ids.push(id); if (ids.length === 1) throw Error('write failed'); } };
    await assert.rejects(deliverSummary(req(), d), /write failed/);
    await deliverSummary(req(), d);
    assert.deepEqual(keys, ['trial-summary/sub-1', 'trial-summary/sub-1']);
    assert.deepEqual(ids, ['re_1', 're_1']);
  });
  it('skips when the ticket is not eligible or the task is gone', async () => {
    const fail = async () => assert.fail();
    assert.equal((await deliverSummary(req(), { take: async () => null, task: fail, translation: fail, send: fail, markSent: fail })).status, 204);
    assert.equal((await deliverSummary(req(), { take: async () => row, task: async () => null, translation: fail, send: fail, markSent: fail })).status, 204);
  });
});
