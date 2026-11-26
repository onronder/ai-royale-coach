// Read-only operator report. Each provider customer is counted once across all configured plans.
import { pathToFileURL } from 'node:url';

import { countSubscriptionOverlaps } from '../supabase/functions/_shared/polar-subscription-overlap.mjs';
export { countSubscriptionOverlaps };

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
