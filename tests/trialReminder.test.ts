import { coachingReturnTag } from '../src/lib/coachingReturnTag';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deliverReminder, reminderMail } from '../supabase/functions/trial-coaching-reminder/delivery';

const request = (body: unknown) => new Request('https://worker.invalid', { method: 'POST', body: JSON.stringify(body) });

describe('one day-two coaching email', () => {
  for (const [language, subject] of [
    ['en-GB', 'Return to your coaching task'], ['tr-TR', 'Koçluk görevine geri dön'],
    ['fr-FR', 'Reprends ta mission de coaching'], ['es-ES', 'Retoma tu tarea de entrenamiento'],
    ['pt-BR', 'Volte à sua tarefa de treino'],
  ]) {
    it('writes the localized reminder for ' + language, () => {
      const mail = reminderMail('test@example.invalid', language, 'P28');
      assert.equal(mail.subject, subject);
      assert.deepEqual(mail.to, ['test@example.invalid']);
      assert.match(mail.text, /https:\/\/ai-royale\.com\/select-player\?coaching=P28/);
    });
  }
  it('rejects malformed requests before touching the database', async () => {
    const fail = async () => assert.fail();
    const store = { claim: fail, freeze: fail, begin: fail, release: fail, record: fail } as never;
    const provider = { send: fail, findAccepted: fail } as never;
    assert.equal((await deliverReminder(request({ ticket: 'invalid' }), store, provider)).status, 400);
    assert.equal((await deliverReminder(new Request('https://worker.invalid'), store, provider)).status, 405);
  });
});

it('preserves only an exact Clash Royale player tag across login', () => {
  assert.equal(coachingReturnTag('uqrcgqjr2'), 'UQRCGQJR2');
  for (const value of [null, '', 'P', 'profile', '/player/UQRCGQJR2', 'P28?next=login']) {
    assert.equal(coachingReturnTag(value), null);
  }
});
