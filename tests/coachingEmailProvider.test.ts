import { it } from 'node:test';
import assert from 'node:assert/strict';
import { resendProvider, type Mail } from '../supabase/functions/_shared/email-attempt';

const mail: Mail = { from: 'Arena', to: ['player@example.invalid'], subject: 'Coach', text: 'Deck',
  tags: [{ name: 'coaching_delivery', value: 'attempt-a' }] };

it('records only the exact tag, including paginated provider responses and SQL timestamps', async () => {
  const urls: string[] = [];
  const row = (id: string, created_at: string) => ({ id, subject: mail.subject, to: mail.to, created_at });
  const provider = resendProvider('fake', async input => {
    const url = new URL(String(input)); urls.push(url.pathname + url.search);
    if (url.pathname === '/emails') {
      if (!url.searchParams.has('after')) return Response.json({ has_more: true, data: [
        row('old','2026-04-03 22:13:42.674981+00'),row('bad','bad timestamp'),row('other','2026-11-15 18:05:00.123456+00')] });
      return Response.json({ has_more: false, data: [row('mine','2026-11-15T18:06:00Z')] });
    }
    return Response.json(url.pathname === '/emails/mine' ? { id: 'mine', tags: mail.tags } : { id: 'other', tags: [{name:'coaching_delivery',value:'another'}] });
  });
  assert.equal(await provider.findAccepted(mail,new Date('2026-11-15T18:00:00Z')),'mine');
  assert.deepEqual(urls,['/emails?limit=100','/emails/other','/emails?limit=100&after=other','/emails/mine']);
  assert.equal(await provider.findAccepted({...mail,tags:undefined},new Date()),null);
});

it('sends the frozen tag and stable key on the wire and never treats a failed lookup as proof of delivery', async () => {
  const provider = resendProvider('fake',async (input, init) => {
    if (init?.method === 'POST') {
      assert.deepEqual(JSON.parse(String(init.body)),mail);
      assert.equal(new Headers(init.headers).get('Idempotency-Key'),'unchanged');
      return Response.json({id:'accepted'});
    }
    return new Response('',{status:503});
  });
  assert.equal(await provider.send(mail,'unchanged'),'accepted');
  await assert.rejects(provider.findAccepted(mail,new Date()), /Could not list/);
});
