// Signed, reusable unsubscribe links for the account's current address (HMAC-SHA256 over the user id). No session needed and nothing changes on GET.
const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function key(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signUnsubscribe(secret: string, userId: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ u: userId })));
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body));
  return body + '.' + b64url(sig);
}
export async function verifyUnsubscribe(secret: string, token: string): Promise<{ userId: string } | null> {
  const [body, sig] = (token ?? '').split('.');
  if (!body || !sig || !secret) return null;
  try {
    if (!await crypto.subtle.verify('HMAC', await key(secret), fromB64url(sig), enc.encode(body))) return null;
    const v = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return typeof v.u === 'string' ? { userId: v.u } : null;
  } catch { return null; }
}
