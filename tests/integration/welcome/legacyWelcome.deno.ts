// Runs the real Edge handler locally. All outbound requests are intercepted.
import assert from 'node:assert/strict';

Deno.test('cached signup tabs only receive an acknowledgement after cutover', async () => {
  const originalServe = Deno.serve, originalFetch = globalThis.fetch;
  let handle: (req: Request) => Promise<Response>;
  const urls: URL[] = [];
  const env = { SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SERVICE_ROLE_KEY: 'local-test', RESEND_API_KEY: 'local-test' };
  const previous = Object.fromEntries(Object.keys(env).map(k => [k, Deno.env.get(k)]));
  try {
    for (const [k,v] of Object.entries(env)) Deno.env.set(k,v);
    Deno.serve = ((fn: typeof handle) => { handle = fn; }) as unknown as typeof Deno.serve;
    globalThis.fetch = (async input => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      urls.push(url);
      assert.equal(url.origin,env.SUPABASE_URL);
      assert.equal(url.pathname,'/rest/v1/welcome_cutover');
      return Response.json([{activated_at:'2026-11-15T09:00:00Z'}]);
    }) as typeof fetch;
    await import('../../../supabase/functions/send-email/index.ts');
    for (let i = 0; i < 3; i++) {
      const res = await handle!(new Request('http://localhost', { method: 'POST',
        body: JSON.stringify({ type:'welcome', email:'fixture@example.invalid', language:'tr' }) }));
      assert.equal(res.status,200);
      assert.deepEqual(await res.json(),{success:true});
    }
    assert.equal(urls.length,3);
  } finally {
    globalThis.fetch = originalFetch; Deno.serve = originalServe;
    for (const [k,v] of Object.entries(previous)) { if (v === undefined) Deno.env.delete(k); else Deno.env.set(k,v); }
  }
});
