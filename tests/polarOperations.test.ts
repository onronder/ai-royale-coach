import { expect, test } from 'bun:test';
import { runPolarOperation, type PolarOperation } from '../supabase/functions/backfill-polar-orders/operations';

const notice: PolarOperation = { id: 'stable-task', kind: 'overdue', overdue_count: 1, created_at: '2026-05-01T10:00:00Z' };
const env = (name: string) => ({ RESEND_API_KEY: 'test', POLAR_ONCALL_EMAILS: 'b@example.invalid,a@example.invalid' }[name]);

test('retry keeps the same key and body, each operator receives a private copy', async () => {
  const bodies: string[] = [];
  const provider = async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(String(url)).toBe('https://api.resend.com/emails/batch');
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('polar-ops/stable-task');
    const body = String(init?.body);
    bodies.push(body);
    const mails = JSON.parse(body);
    expect(mails.map((m: { to: string[] }) => m.to)).toEqual([['a@example.invalid'], ['b@example.invalid']]);
    expect(mails[0].text).toContain('1.');
    return Response.json({ data: [{ id: 'accepted-a' }, { id: 'accepted-b' }] });
  };
  expect((await runPolarOperation(notice, env, provider as typeof fetch)).accepted).toBe(2);
  await runPolarOperation(notice,env,provider as typeof fetch);
  expect(bodies[0]).toBe(bodies[1]);
});

test('does not acknowledge missing routes, provider conflicts or partial acceptance', async () => {
  await expect(runPolarOperation(notice,()=>undefined,fetch)).rejects.toThrow('configuration incomplete');
  await expect(runPolarOperation(notice,env,(async()=>new Response('{}',{status:409})) as typeof fetch)).rejects.toThrow('409');
  await expect(runPolarOperation(notice,env,(async()=>Response.json({ data:[{ id:'one' }] })) as typeof fetch)).rejects.toThrow('Incomplete');
});
test('daily reconciliation scans the three products without a mail credential', async () => {
  const values: Record<string,string> = { POLAR_ACCESS_TOKEN:'read', POLAR_PRODUCT_ID_1:'one',POLAR_PRODUCT_ID_2:'two',POLAR_PRODUCT_ID_3:'three' };
  const requested: string[] = [];
  const result=await runPolarOperation({ ...notice, kind:'overlap' }, k=>values[k], (async url => {
    const u=new URL(String(url));
    expect(u.origin).toBe('https://api.polar.sh');
    const p=u.searchParams.get('product_id')!;
    requested.push(p);
    return Response.json({items:[{id:p,product_id:p,customer_id:p==='three'?'b':'a',status:'active'}],pagination:{max_page:1,total_count:1}});
  }) as typeof fetch);
  expect(requested).toEqual(['one','two','three']);
  expect(result.customers_with_multiple_active_subscriptions).toBe(1);
});
