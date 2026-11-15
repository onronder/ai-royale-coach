import { coachingReturnTag } from '../src/lib/coachingReturnTag';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deliverReminder, type Reminder } from '../supabase/functions/trial-coaching-reminder/delivery';

const ticket = '44dd2c00-eae7-4ea1-8865-b7510387d350';
const row: Reminder = { user_id: 'owner', subscription_id: 'sub-123', email: 'test@example.invalid', language: 'tr', player_tag: 'P28' };
const request = (body: unknown) => new Request('https://worker.invalid', { method: 'POST', body: JSON.stringify(body) });

describe('one day-two coaching email', () => {
  for (const [language, subject] of [
    ['en-GB', 'Return to your coaching task'], ['tr-TR', 'Koçluk görevine geri dön'],
    ['fr-FR', 'Reprends ta mission de coaching'], ['es-ES', 'Retoma tu tarea de entrenamiento'],
    ['pt-BR', 'Volte à sua tarefa de treino'],
  ]) {
    it('sends the localized reminder for ' + language, async () => {
      let sent = 0;
      const response = await deliverReminder(request({ ticket }), {
        take: async () => ({ ...row, language }),
        send: async payload => {
          assert.equal(payload.subject, subject);
          assert.match(payload.text, /https:\/\/ai-royale\.com\/select-player\?coaching=P28/);
          sent++; return 'msg-1';
        },
        markSent: async () => {},
      });
      assert.equal(response.status, 204);
      assert.equal(sent, 1);
    });
  }

  it('ignores client recipients, localizes the email and records acceptance after sending', async () => {
    const events: string[] = [];
    const res = await deliverReminder(request({ ticket, email: 'wrong@example.invalid' }), {
      take: async value => { assert.equal(value, ticket); return row; },
      send: async (message, key) => {
        assert.deepEqual(message.to, [row.email]); assert.equal(key, 'trial-coaching/sub-123');
        assert.match(message.subject, /görevine/); assert.match(message.text, /ai-royale\.com\/select-player\?coaching=P28/);
        events.push('accepted'); return 're_123';
      },
      markSent: async (marked, id) => { assert.equal(marked, row); assert.equal(id, 're_123'); events.push('recorded'); },
    });
    assert.equal(res.status, 204); assert.deepEqual(events, ['accepted', 'recorded']);
  });
  it('does no delivery for a consumed or ineligible ticket and rejects malformed requests', async () => {
    let reads = 0;
    const worker = { take: async () => { reads++; return null; }, send: async () => assert.fail(), markSent: async () => assert.fail() };
    assert.equal((await deliverReminder(request({ ticket }), worker)).status, 204);
    assert.equal((await deliverReminder(request({ ticket: 'invalid' }), worker)).status, 400);
    assert.equal((await deliverReminder(new Request('https://worker.invalid'), worker)).status, 405);
    assert.equal(reads, 1);
  });
  it('does not mark a rejected email as sent', async () => {
    await assert.rejects(deliverReminder(request({ ticket }), {
      take: async () => row, send: async () => { throw Error('provider unavailable'); }, markSent: async () => assert.fail(),
    }), /provider unavailable/);
  });
  it('reuses the same provider key if acceptance was not recorded', async () => {
    const keys: string[] = [];
    const delivery = {
      take: async () => row, send: async (_: unknown, key: string) => { keys.push(key); return 're_same'; },
      markSent: async () => { if (keys.length === 1) throw Error('write failed'); },
    };
    await assert.rejects(deliverReminder(request({ ticket }), delivery), /write failed/);
    assert.equal((await deliverReminder(request({ ticket }), delivery)).status, 204);
    assert.deepEqual(keys, ['trial-coaching/sub-123', 'trial-coaching/sub-123']);
  });
});


it('preserves only an exact Clash Royale player tag across login', () => {
  assert.equal(coachingReturnTag('uqrcgqjr2'), 'UQRCGQJR2');
  for (const value of [null, '', 'P', 'profile', '/player/UQRCGQJR2', 'P28?next=login']) {
    assert.equal(coachingReturnTag(value), null);
  }
});
