import { describe, expect, it } from 'vitest';
import { readPolarMrr } from '../supabase/functions/polar-mrr/metrics';

const products = ['pro1','pro2','pro3'];
const now = new Date('2026-11-17T16:00:00Z');
const timestamp = '2026-11-16T21:00:00Z';
const provider = (periods: unknown[], status = 200): typeof fetch => (async () =>
  new Response(JSON.stringify({ periods, totals: { monthly_recurring_revenue: 9999 } }), { status })) as typeof fetch;

describe('Polar daily MRR', () => {
  it('reads the exact Istanbul day, using the three AI Royale products and only the MRR metric', async () => {
    const request: typeof fetch = (async (input, init) => {
      const url = new URL(String(input));
      expect(url.origin + url.pathname).toBe('https://api.polar.sh/v1/metrics/');
      expect(init?.method ?? 'GET').toBe('GET');
      expect(url.searchParams.getAll('product_id')).toEqual(products);
      expect(url.searchParams.get('metrics')).toBe('monthly_recurring_revenue');
      expect(url.searchParams.get('start_date')).toBe('2026-11-17');
      expect(url.searchParams.get('end_date')).toBe('2026-11-17');
      expect(url.searchParams.get('interval')).toBe('day');
      expect(url.searchParams.get('timezone')).toBe('Europe/Istanbul');
      return provider([{ timestamp: '2026-11-15T21:00:00Z', monthly_recurring_revenue: 2495 }, {
        timestamp, monthly_recurring_revenue: 4491, committed_monthly_recurring_revenue: 3992, trial_monthly_recurring_revenue: 2495,
      }])(url);
    }) as typeof fetch;
    expect(await readPolarMrr('test', products, new Date('2026-11-16T21:01:00Z'), request))
      .toEqual({ date: '2026-11-17', cents: 4491, currency: 'USD' });
  });
  it('preserves a real zero and fractional cents', async () => {
    for (const cents of [0, 499.5]) {
      const value = await readPolarMrr('test',products,now,provider([{ timestamp, monthly_recurring_revenue: cents }]));
      expect(value.cents).toBe(cents);
    }
  });
  it('leaves missing, ambiguous and wrong-day values unavailable', async () => {
    const zero = {timestamp, monthly_recurring_revenue: 0};
    for (const rows of [[], [null], [{timestamp}], [{timestamp, monthly_recurring_revenue: null}], [zero,zero],
      [{timestamp:'2026-11-15T21:00:00Z',monthly_recurring_revenue:499}], [{timestamp,monthly_recurring_revenue:-1}]]) {
      await expect(readPolarMrr('test', products, now, provider(rows))).rejects.toThrow('No verified MRR');
    }
  });
  it('does not broaden the product scope or conceal access or provider errors as zero', async () => {
    await expect(readPolarMrr('test', ['one','','three'], now, provider([]))).rejects.toThrow('Incomplete product');
    for (const status of [403,429,500]) {
      await expect(readPolarMrr('test', products, now, provider([],status))).rejects.toThrow(String(status));
    }
  });
});
