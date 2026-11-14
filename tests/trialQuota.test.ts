import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAiAccess } from '../supabase/functions/_shared/ai-access';

function account(status = 'trialing', admin = false, periodEnd = '2099-01-01', renewalOff = false) {
  return {
    async rpc(name: string) {
      assert.equal(name, 'is_admin');
      return { data: admin };
    },
    from(table: string) {
      assert.ok(['user_subscriptions', 'profiles'].includes(table), 'Entitlement should never consult a usage counter');
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          return { data: table === 'user_subscriptions' ? { status, current_period_end: periodEnd, cancel_at_period_end: renewalOff } : null };
        },
      };
    },
  };
}

describe('trial AI access', () => {
  it('keeps every request available on consecutive and concurrent entitlement checks', async () => {
    const db = account();
    for (let round = 0; round < 2; round++) {
      const results = await Promise.all(Array.from({ length: 3 }, () => checkAiAccess(db, 'user')));
      for (const result of results) assert.deepEqual(result, { allowed: true, isTrial: true, isPaid: false, isAdmin: false });
    }
  });
  it('allows a trial with renewal off until its end', async () => {
    assert.equal((await checkAiAccess(account('trialing', false, '2099-01-01', true), 'user')).allowed, true);
  });
  it('denies new AI generation after expiry', async () => {
    for (const status of ['trialing', 'expired']) assert.equal((await checkAiAccess(account(status, false, '2020-01-01'), 'user')).allowed, false);
  });
  it('preserves paid and admin access', async () => {
    assert.equal((await checkAiAccess(account('active'), 'user')).isPaid, true);
    assert.equal((await checkAiAccess(account('expired', true), 'user')).isAdmin, true);
  });
});
