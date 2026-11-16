// Signed, reusable unsubscribe links (HMAC-SHA256 over the user id and, for campaign emails, the campaign key so the link
// acts on the address that campaign was sent to). No session needed and nothing changes on GET.
const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function key(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signUnsubscribe(secret: string, userId: string, campaignKey?: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(campaignKey ? { u: userId, c: campaignKey } : { u: userId })));
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body));
  return body + '.' + b64url(sig);
}
export async function verifyUnsubscribe(secret: string, token: string): Promise<{ userId: string; campaignKey?: string } | null> {
  const [body, sig] = (token ?? '').split('.');
  if (!body || !sig || !secret) return null;
  try {
    if (!await crypto.subtle.verify('HMAC', await key(secret), fromB64url(sig), enc.encode(body))) return null;
    const v = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (typeof v.u !== 'string') return null;
    return typeof v.c === 'string' ? { userId: v.u, campaignKey: v.c } : { userId: v.u };
  } catch { return null; }
}
