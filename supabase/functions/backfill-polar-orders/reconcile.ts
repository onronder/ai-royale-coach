// The Orders API supplies current money/status. Only a system payment event supplies a historical paid_at.
export type PolarOrder = {
  id: string; created_at: string; modified_at?: string; customer_id: string; product_id: string;
  customer?: { external_id?: string }; metadata?: { user_id?: string }; subscription_id?: string;
  net_amount: number; total_amount?: number; tax_amount?: number; currency: string; status: string;
  billing_reason?: string; discount_amount?: number; refunded_amount?: number;
};
type PaidEvent = {
  source: string; name: string; customer_id: string; timestamp: string;
  metadata?: { order_id?: string; subscription_id?: string; product_id?: string };
};
type Page<T> = { items: T[]; pagination: { max_page: number } };
type PolarGet = <T>(path: string, params: URLSearchParams) => Promise<Page<T>>;

export function orderRow(o: PolarOrder) {
  if (!o.id || !Number.isInteger(o.net_amount) || !o.currency || !o.status || !Number.isFinite(Date.parse(o.created_at))) {
    throw new Error('Polar returned incomplete order data');
  }
  return {
    order_id: o.id, user_id: o.customer?.external_id || o.metadata?.user_id || null,
    customer_id: o.customer_id, subscription_id: o.subscription_id ?? null,
    amount: o.net_amount, gross_amount: o.total_amount ?? null, tax_amount: o.tax_amount ?? null,
    currency: o.currency, status: o.status, billing_reason: o.billing_reason ?? null,
    refunded_net_cents: o.refunded_amount ?? null, discount_amount_cents: o.discount_amount ?? null,
    provider_updated_at: o.modified_at ?? o.created_at, created_at: o.created_at,
  };
}

type PaymentDate = { order_id: string; customer_id: string; paid_at: string };

export async function paymentDates(get: PolarGet, orders: PolarOrder[], now = Date.now()) {
  if (!orders.length) return [];
  const pending = new Map(orders.map(o => [o.id, o]));
  const dates: PaymentDate[] = [];
  const query = new URLSearchParams({ source: 'system', name: 'order.paid', sorting: 'timestamp',
    start_timestamp: new Date(Math.min(...orders.map(o => Date.parse(o.created_at))) - 1).toISOString(), limit: '100' });
  for (const customer of new Set(orders.map(o => o.customer_id))) query.append('customer_id', customer);
  for (let page = 1; ; page++) {
    query.set('page', String(page));
    const result = await get<PaidEvent>('events', query);
    for (const e of result.items) {
      const o = e.metadata?.order_id ? pending.get(e.metadata.order_id) : undefined;
      const time = Date.parse(e.timestamp);
      if (!o || e.source !== 'system' || e.name !== 'order.paid' || !o.customer_id || e.customer_id !== o.customer_id
          || (e.metadata?.product_id && e.metadata.product_id !== o.product_id)
          || (e.metadata?.subscription_id && e.metadata.subscription_id !== o.subscription_id)
          || !(time >= Date.parse(o.created_at) && time <= now)) continue;
      dates.push({ order_id: o.id, customer_id: o.customer_id, paid_at: e.timestamp });
      pending.delete(o.id);
    }
    if (!pending.size || page >= result.pagination.max_page) return dates;
  }
}

type Store = {
  saveOrders(rows: ReturnType<typeof orderRow>[]): Promise<void>;
  missingDates(ids: string[]): Promise<Set<string>>;
  saveDates(dates: PaymentDate[]): Promise<number>;
};

export async function reconcilePage(get: PolarGet, store: Store, products: string[], page: number) {
  if (!products.length) throw new Error('AI Royale product configuration missing');
  const query = new URLSearchParams({ sorting: 'created_at', page: String(page), limit: '50' });
  for (const id of products) query.append('product_id', id);
  const result = await get<PolarOrder>('orders', query);
  const orders = result.items.filter(o => products.includes(o.product_id));
  if (orders.length) await store.saveOrders(orders.map(orderRow));
  const positive = orders.filter(o => (o.status === 'paid' || (o.status === 'partially_refunded' && o.refunded_amount != null))
    && o.net_amount > (o.refunded_amount ?? 0));
  const missing = positive.length ? await store.missingDates(positive.map(o => o.id)) : new Set<string>();
  const dates = await paymentDates(get, positive.filter(o => missing.has(o.id)));
  const dated = dates.length ? await store.saveDates(dates) : 0;
  const unresolved = dated < dates.length
    ? (await store.missingDates(positive.map(o => o.id))).size
    : missing.size - dated;
  return { saved: orders.length, zero: orders.filter(o => o.net_amount === 0).length,
    positive: positive.length, dated, missing: unresolved, more: page < result.pagination.max_page };
}
