import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countSubscriptionOverlaps } from '../scripts/polar-subscription-overlap.mjs';

test('Polar overlap is grouped across pages and products by provider customer, including paid-through cancellations', async () => {
  const p = (id: string, customer_id: string, product_id: string, status: string) =>
    ({ id, customer_id, product_id, status, cancel_at_period_end: true });
  const pages = {
    one: [[p('s1','a','one','active')], [p('s2','b','one','trialing')]],
    two: [[p('s3','a','two','active'), p('s4','b','two','active'), p('s5','a','two','canceled')]],
    three: [[]],
  };
  const result = await countSubscriptionOverlaps(Object.keys(pages), async (product: keyof typeof pages, page: number) => ({
    items: pages[product][page-1], pagination: { total_count: pages[product].flat().length, max_page: pages[product].length },
  }));
  assert.deepEqual(result, { subscriptions_scanned: 5, active_subscriptions: 3,
    customers_with_multiple_active_subscriptions: 1, customers_with_multiple_active_or_trialing_subscriptions: 2 });
});

test('a partial provider export cannot produce a clean overlap result', async () => {
  await assert.rejects(countSubscriptionOverlaps(['one'], async () => ({
    items: [], pagination: { total_count: 1, max_page: 1 },
  })), /Partial/);
});
