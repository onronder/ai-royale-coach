import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { deliverReminder, type Reminder } from './delivery.ts';

Deno.serve(async req => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    return await deliverReminder(req, {
      async take(ticket) {
        const { data, error } = await db.rpc('take_trial_coaching_reminder', { p_ticket: ticket }).maybeSingle();
        if (error) throw error;
        return data as Reminder | null;
      },
      async send(payload, key) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + Deno.env.get('RESEND_API_KEY'),
            'Content-Type': 'application/json', 'Idempotency-Key': key },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
        });
        if (!response.ok || !(await response.json()).id) throw new Error('Email delivery was not accepted');
      },
      async markSent({ user_id, subscription_id }) {
        const { error } = await db.from('trial_coaching_followup').update({ sent_at: new Date().toISOString() })
          .eq('user_id', user_id).eq('subscription_id', subscription_id);
        if (error) throw error;
      },
    });
  } catch {
    console.error('Trial coaching reminder could not be delivered or recorded');
    return new Response(null, { status: 503 });
  }
});
