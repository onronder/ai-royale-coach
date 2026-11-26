import { countSubscriptionOverlaps } from '../_shared/polar-subscription-overlap.mjs';

export type PolarOperation = {
  id: string;
  kind: 'overdue' | 'recovered' | 'overlap';
  created_at: string;
  overdue_count: number;
};

export async function runPolarOperation(
  task: PolarOperation,
  env: (name: string) => string | undefined,
  request: typeof fetch,
) {
  if (task.kind === 'overlap') {
    const token = env('POLAR_ACCESS_TOKEN');
    const products = [1, 2, 3].map(n => env('POLAR_PRODUCT_ID_' + n));
    if (!token || products.some(id => !id) || new Set(products).size !== 3) {
      throw new Error('Polar read token and three distinct products required');
    }
    return await countSubscriptionOverlaps(products, async (product: string, page: number) => {
      const url = new URL('https://api.polar.sh/v1/subscriptions/');
      url.search = new URLSearchParams({ product_id: product, page: String(page), limit: '100' }).toString();
      const response = await request(url, {
        headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Polar subscription read returned ' + response.status);
      return response.json();
    });
  }

  const key = env('RESEND_API_KEY');
  const recipients = [...new Set((env('POLAR_ONCALL_EMAILS') ?? '').split(',').map(s => s.trim().toLowerCase()))].sort();
  if (!key || recipients.some(s => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(s))) {
    throw new Error('Polar on-call mail configuration incomplete');
  }
  const overdue = task.kind === 'overdue';
  const subject = overdue ? 'AI Royale · Polar webhook alarmı' : 'AI Royale · Polar webhook alarmı düzeldi';
  const text = (overdue
    ? 'En az bir saattir çözülmemiş Polar bildirimi sayısı: ' + task.overdue_count + '.'
    : 'En az bir saattir çözülmemiş Polar bildirimi kalmadı.') +
    (env('POLAR_ONCALL_DRILL') === 'true' ? '\nBu ileti yayın öncesi kontrollü tatbikata aittir.' : '') +
    '\nKontrol zamanı (UTC): ' + new Date(task.created_at).toISOString() +
    '\nAI Royale yönetim paneli: https://ai-royale.com/admin';
  const response = await request('https://api.resend.com/emails/batch', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': 'polar-ops/' + task.id },
    body: JSON.stringify(recipients.map(address => ({ from: 'AI Royale <noreply@notification.ai-royale.com>', to: [address], subject, text }))),
  });
  if (!response.ok) throw new Error('On-call mail returned ' + response.status);
  const batch = await response.json();
  if (!Array.isArray(batch.data) || batch.data.length !== recipients.length ||
      !batch.data.every((row: { id?: string } | null) => typeof row?.id === 'string' && row.id.length > 0)) {
    throw new Error('Incomplete on-call provider receipt');
  }
  return { accepted: recipients.length, provider_ids: batch.data.map((row: { id: string }) => row.id) };
}
