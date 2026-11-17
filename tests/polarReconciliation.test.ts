import { describe, expect, it } from 'vitest';
import { paymentDates, reconcilePage, type PolarOrder } from '../supabase/functions/backfill-polar-orders/reconcile';

const order = (id: string): PolarOrder => ({
  id, customer_id: 'customer-' + id, product_id: 'pro', subscription_id: 'subscription-' + id,
  net_amount: 499, total_amount: 599, tax_amount: 100, currency: 'usd', status: 'paid',
  created_at: '2026-01-01T12:00:00Z', modified_at: '2026-01-06T17:00:00Z',
});
const receipt = (o: PolarOrder) => ({
  name: 'order.paid', source: 'system', timestamp: '2026-01-02T12:34:56.123456Z',
  customer_id: o.customer_id, metadata: { order_id: o.id, subscription_id: o.subscription_id },
});
const page = (items: unknown[], max_page = 1) => ({ items, pagination: { max_page } });
type Get = Parameters<typeof reconcilePage>[0];
const fake = (fn: (path: string, params: URLSearchParams) => ReturnType<typeof page>): Get =>
  async <T>(path: string, params: URLSearchParams) => fn(path, params) as { items: T[]; pagination: { max_page: number } };

describe('Polar reconciliation', () => {
  it('matches the exact system payment on a later page and preserves its full timestamp', async () => {
    const o = order('one'), e = receipt(o);
    const get = fake((path, params) => {
      expect(path).toBe('events');
      expect(params.get('source')).toBe('system');
      expect(params.get('name')).toBe('order.paid');
      expect(params.getAll('customer_id')).toEqual([o.customer_id]);
      if (params.get('page') === '1') return page([
        {...e, source:'user'}, {...e, name:'order.created'}, {...e, customer_id:'other'},
        {...e, metadata:{order_id:'other'}}, {...e, metadata:{...e.metadata,subscription_id:'other'}},
        {...e, timestamp:'2020-01-01T00:00:00Z'}, {...e, timestamp:'2100-01-01T00:00:00Z'},
      ], 2);
      return page([e, e],2);
    });
    expect(await paymentDates(get,[o])).toEqual([{order_id:o.id,customer_id:o.customer_id,paid_at:e.timestamp}]);
  });

  it('syncs only configured products and distinguishes an undated positive order from a zero order', async () => {
    const orders = [order('a'), order('b'), order('c'), {...order('zero'), net_amount:0},
      {...order('other'),product_id:'another-app'}];
    const saved = new Map<string, number>(), dates = new Map<string, string>();
    let fail = true, eventReads = 0;
    const get = fake((path, params) => {
      if (path === 'orders') {
        expect(params.getAll('product_id')).toEqual(['pro']);
        expect(params.get('page')).toBe('1');
        return page(orders);
      }
      eventReads++;
      if (fail) throw new Error('events unavailable');
      expect(params.getAll('customer_id')).not.toContain('customer-zero');
      return page(orders.slice(0,2).map(receipt));
    });
    const store: Parameters<typeof reconcilePage>[1] = {
      async saveOrders(rows) { for (const r of rows) saved.set(r.order_id,r.amount); },
      async missingDates(ids) { return new Set(ids.filter(id=>!dates.has(id))); },
      async saveDates(rows) { for (const d of rows) dates.set(d.order_id,d.paid_at); return rows.length; },
    };
    await expect(reconcilePage(get,store,['pro'],1)).rejects.toThrow('events unavailable');
    expect([...saved.values()].reduce((a,b)=>a+b,0)).toBe(1497);
    fail=false;
    expect(await reconcilePage(get,store,['pro'],1)).toEqual({saved:4,zero:1,positive:3,dated:2,missing:1,more:false});
    expect(await reconcilePage(get,store,['pro'],1)).toMatchObject({dated:0,missing:1});
    expect(saved.size).toBe(4);
    expect(dates.has('c')).toBe(false);
    expect(eventReads).toBe(3);
  });
});
