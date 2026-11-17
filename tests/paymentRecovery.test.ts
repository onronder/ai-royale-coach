import { it } from 'node:test';
import assert from 'node:assert/strict';
import { routeBillingRequest } from '../supabase/functions/create-checkout/recovery.ts';

it('routes a stale checkout for a past-due account to its own Polar customer session', async () => {
  let calls = 0;
  const fake: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://api.polar.sh/v1/customer-sessions/');
    assert.deepEqual(JSON.parse(String(init?.body)), { external_customer_id: 'signed-in-id' });
    return Response.json({ customer_portal_url: 'https://polar.sh/test/portal' });
  };
  for (const recovery of [false,true]) {
    assert.deepEqual(await routeBillingRequest('past_due',recovery,{ external_customer_id: 'signed-in-id' },'fake',fake),
      { checkoutUrl: 'https://polar.sh/test/portal' });
  }
  assert.equal(calls,2);
});

it('a resolved recovery request never falls through to checkout and other ordinary purchases still work', async () => {
  const noRequests = async () => { throw Error('unexpected request'); };
  for (const status of ['active','trialing','expired',null]) {
    const result = await routeBillingRequest(status,true,{ customer_id: 'stored-id' },'fake',noRequests);
    assert.ok(result && 'status' in result && result.status === 409);
    assert.equal(await routeBillingRequest(status,false,{ customer_id: 'stored-id' },'fake',noRequests),null);
  }
});

it('a provider error returns no replacement checkout URL', async () => {
  const result = await routeBillingRequest('past_due',true,{ customer_id: 'stored-id' },'fake',async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { customer_id: 'stored-id' });
    return new Response(null,{status:403});
  });
  assert.ok(result && 'status' in result && result.status === 502);
  for (const url of ['invalid', 'https://example.invalid']) {
    const response = await routeBillingRequest('past_due', true, { customer_id: 'stored-id' }, 'fake',
      async () => Response.json({ customer_portal_url: url }));
    assert.ok(response && 'status' in response && response.status === 502);
  }
});
