// Receives Resend delivery events (signed by Svix). Complaints and permanent bounces become technical address blocks.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleResendEvent } from '../_shared/resend-events.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? '';
  if (!secret) { console.error('RESEND_WEBHOOK_SECRET is not configured'); return new Response('not configured', { status: 503 }); }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await req.text();
  try {
    const r = await handleResendEvent(secret, {
      id: req.headers.get('svix-id'), timestamp: req.headers.get('svix-timestamp'), signature: req.headers.get('svix-signature'),
    }, body, async (eventId, type, email, block) => {
      const { data, error } = await supabase.rpc('record_provider_email_event', { p_event_id: eventId, p_type: type, p_email: email, p_block_reason: block });
      if (error) throw new Error(error.message);
      return data as string;
    });
    return new Response(JSON.stringify(r.results ?? { status: r.status }), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('resend-webhook failed:', (e as Error).message);
    return new Response('retry', { status: 500 }); // Svix retries; events are applied once per id.
  }
});
