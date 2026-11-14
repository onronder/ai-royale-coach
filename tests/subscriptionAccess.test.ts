import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { subscriptionAccess } from '../supabase/functions/_shared/subscription-access';

const now = new Date('2026-11-14T12:00:00Z');
const future = '2026-11-16T12:00:00Z';
const past = '2026-11-13T12:00:00Z';

describe('subscriptionAccess', () => {
  it('trial with renewal on keeps trial access until the end date', () => {
    assert.equal(subscriptionAccess({ status: 'trialing', current_period_end: future }, now), 'trial');
  });
  it('trial with renewal turned off in the first minute still has trial access until the end', () => {
    assert.equal(subscriptionAccess({ status: 'trialing', current_period_end: future, cancel_at_period_end: true, ends_at: future }, now), 'trial');
  });
  it('trial past its end date has no access', () => {
    assert.equal(subscriptionAccess({ status: 'trialing', current_period_end: past }, now), 'none');
  });
  it('paid user with renewal off keeps paid access until period end', () => {
    assert.equal(subscriptionAccess({ status: 'active', current_period_end: future, cancel_at_period_end: true }, now), 'paid');
  });
  it('paid user with renewal off loses access after period end', () => {
    assert.equal(subscriptionAccess({ status: 'active', current_period_end: past, cancel_at_period_end: true }, now), 'none');
  });
  it('really ended subscriptions get no access even with a future date', () => {
    assert.equal(subscriptionAccess({ status: 'cancelled', current_period_end: future }, now), 'none');
    assert.equal(subscriptionAccess({ status: 'expired', current_period_end: future }, now), 'none');
  });
});
