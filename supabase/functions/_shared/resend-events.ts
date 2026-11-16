// Resend (Svix-signed) delivery events → technical address blocks. A complaint or a permanent bounce blocks later campaign
// sends to that address; it is never recorded as the player withdrawing consent. Transient bounces change nothing.
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const TOLERANCE_SECONDS = 300;

export async function signSvix(secret: string, id: string, timestamp: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', fromB64(secret.replace(/^whsec_/, '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return 'v1,' + b64(await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${timestamp}.${body}`)));
}

export async function verifySvix(secret: string, headers: { id: string | null; timestamp: string | null; signature: string | null }, body: string,
  nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;
  const expected = await signSvix(secret, id, ts, body);
  const a = enc.encode(expected);
  return signature.split(' ').some(s => {
    const b = enc.encode(s);
    if (a.length !== b.length) return false;
    let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  });
}

export type BlockReason = 'hard_bounce' | 'complaint' | null;
export interface ProviderEvent { type?: string; data?: { from?: string; to?: string[] | string; bounce?: { type?: string } } }
export function classify(ev: ProviderEvent): { emails: string[]; block: BlockReason } {
  const to = ev.data?.to; const emails = (Array.isArray(to) ? to : to ? [to] : []).filter(e => typeof e === 'string' && e.includes('@'));
  if (ev.type === 'email.complained') return { emails, block: 'complaint' };
  if (ev.type === 'email.bounced' && (ev.data?.bounce?.type ?? '').toLowerCase() === 'permanent') return { emails, block: 'hard_bounce' };
  return { emails, block: null };
}

export type RecordEvent = (eventId: string, type: string, email: string, block: BlockReason) => Promise<string>;
export async function handleResendEvent(secret: string, headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string, record: RecordEvent, nowSeconds?: number): Promise<{ status: number; results?: string[] }> {
  if (!await verifySvix(secret, headers, body, nowSeconds)) return { status: 401 };
  let ev: ProviderEvent; try { ev = JSON.parse(body); } catch { return { status: 400 }; }
  // The Resend team also serves other products. Ignore their events before reading recipients.
  const from = ev?.data?.from;
  const sender = typeof from === 'string' ? from.trim().toLowerCase() : '';
  if (sender !== 'noreply@notification.ai-royale.com' && sender !== 'ai royale <noreply@notification.ai-royale.com>') {
    return { status: 200, results: [] };
  }
  const { emails, block } = classify(ev);
  const results: string[] = [];
  for (const [i, email] of emails.entries()) results.push(await record(`${headers.id}:${i}`, ev.type ?? 'unknown', email, block));
  return { status: 200, results };
}
