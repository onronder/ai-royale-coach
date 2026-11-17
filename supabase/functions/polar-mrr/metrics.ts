const zone = 'Europe/Istanbul';
const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });

export async function readPolarMrr(token: string, products: string[], now = new Date(), request = fetch) {
  const date = day.format(now);
  const url = new URL('https://api.polar.sh/v1/metrics/');
  url.search = new URLSearchParams({ start_date: date, end_date: date, interval: 'day', timezone: zone, metrics: 'monthly_recurring_revenue' }).toString();
  if (products.length !== 3 || products.some(id => !id.trim())) throw new Error('Incomplete product scope');
  for (const id of new Set(products)) url.searchParams.append('product_id', id);
  const res = await request(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('Polar metrics HTTP ' + res.status);
  const body = await res.json();
  if (!Array.isArray(body?.periods)) throw new Error('Invalid Polar response');
  const matches = body.periods.filter((p: {timestamp?: string} | null) => {
    if (typeof p?.timestamp !== 'string') return false;
    const stamp = new Date(p.timestamp);
    return Number.isFinite(stamp.getTime()) && day.format(stamp) === date;
  });
  const amount = matches[0]?.monthly_recurring_revenue;
  if (matches.length !== 1 || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    throw new Error('No verified MRR for the reporting day');
  }
  return { cents: amount, currency: 'USD', date };
}
