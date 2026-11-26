// Read-only operator report. Each provider customer is counted once across all configured plans.
import { pathToFileURL } from 'node:url';

export async function countSubscriptionOverlaps(products, getPage) {
  const customers = new Map();
  let scanned = 0;
  for (const product of new Set(products)) {
    const ids = new Set();
    let expected = null;
    for (let page = 1; ; page++) {
      const { items, pagination } = await getPage(product, page);
      if (!Array.isArray(items) || !Number.isInteger(pagination?.total_count) ||
          !Number.isInteger(pagination.max_page) || pagination.total_count < 0 || pagination.max_page < 0) {
        throw new Error('Unusable Polar pagination');
      }
      expected ??= pagination.total_count;
      if (expected !== pagination.total_count) throw new Error('Polar subscription list changed during the scan');
      for (const row of items) {
        if (!row.id || row.product_id !== product || ids.has(row.id) || !row.status) {
          throw new Error('Incomplete or repeated subscription in Polar page');
        }
        ids.add(row.id);
        if (row.status !== 'active' && row.status !== 'trialing') continue;
        if (!row.customer_id) throw new Error('Entitled subscription is missing its Polar customer ID');
        const counts = customers.get(row.customer_id) ?? { active: 0, entitled: 0 };
        counts.entitled++;
        if (row.status === 'active') counts.active++;
        customers.set(row.customer_id, counts);
      }
      if (page >= pagination.max_page) break;
      if (!items.length) throw new Error('Incomplete Polar pagination');
    }
    if (ids.size !== expected) throw new Error('Partial Polar subscription scan');
    scanned += ids.size;
  }
  const groups = [...customers.values()];
  return {
    subscriptions_scanned: scanned,
    active_subscriptions: groups.reduce((n, c) => n + c.active, 0),
    customers_with_multiple_active_subscriptions: groups.filter(c => c.active > 1).length,
    customers_with_multiple_active_or_trialing_subscriptions: groups.filter(c => c.entitled > 1).length,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const environment = process.argv[2];
  if (!['--sandbox', '--production'].includes(environment)) throw new Error('Specify --sandbox or --production');
  const sandbox = environment === '--sandbox';
  const prefix = sandbox ? 'POLAR_SANDBOX_' : 'POLAR_';
  const token = process.env[prefix + 'ACCESS_TOKEN'];
  const products = [1, 2, 3].map(n => process.env[prefix + 'PRODUCT_ID_' + n]);
  if (!token || products.some(id => !id)) throw new Error('Configure the read token and all three product IDs for this environment');
  const started = new Date().toISOString();
  const result = await countSubscriptionOverlaps(products, async (product, page) => {
    const url = new URL('/v1/subscriptions/', sandbox ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh');
    url.search = new URLSearchParams({ product_id: product, page: String(page), limit: '100' }).toString();
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, redirect: 'error' });
    if (!response.ok) throw new Error('Polar subscription read returned HTTP ' + response.status);
    return response.json();
  });
  console.log(JSON.stringify({ environment: environment.slice(2), started_at: started, finished_at: new Date().toISOString(), ...result }, null, 2));
}
