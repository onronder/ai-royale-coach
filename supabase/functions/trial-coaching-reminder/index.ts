import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { deliverReminder, type Reminder, type ReminderPayload } from './delivery.ts';

Deno.serve(async req => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    return await deliverReminder(req, {
      async take(ticket) {
        const { data, error } = await db.rpc('claim_trial_coaching_reminder', { p_ticket: ticket }).maybeSingle();
        if (error) throw error;
        return data as Reminder | null;
      },
      async freeze({ user_id, subscription_id }, payload) {
        const { data, error } = await db.rpc('freeze_trial_coaching_reminder', { p_user: user_id, p_subscription: subscription_id, p_payload: payload as never });
        if (error) throw error;
        return (data ?? null) as ReminderPayload | null;
      },
      async send(payload, key) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + Deno.env.get('RESEND_API_KEY'),
            'Content-Type': 'application/json', 'Idempotency-Key': key },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
        });
        const id = response.ok ? (await response.json()).id : null;
        if (typeof id !== 'string' || !id) throw new Error('Email delivery was not accepted');
        return id;
      },
      async markSent({ user_id, subscription_id }, messageId) {
        const { error } = await db.from('trial_coaching_followup').update({ sent_at: new Date().toISOString(), resend_message_id: messageId })
          .eq('user_id', user_id).eq('subscription_id', subscription_id).is('sent_at', null);
        if (error) throw error;
      },
    });
  } catch {
    console.error('Trial coaching reminder could not be delivered or recorded');
    return new Response(null, { status: 503 });
  }
});
