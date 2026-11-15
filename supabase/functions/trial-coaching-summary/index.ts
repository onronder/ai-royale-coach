import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { deliverSummary, type Summary, type SummaryTask } from './summary.ts';

Deno.serve(async req => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    return await deliverSummary(req, {
      async take(ticket) {
        const { data, error } = await db.rpc('take_trial_summary', { p_ticket: ticket }).maybeSingle();
        if (error) throw error;
        return data as Summary | null;
      },
      async task({ task_id, user_id }) {
        const { data, error } = await db.from('coaching_tasks')
          .select('id,language,source_deck,recommended_deck,recommendation,follow_up_question,follow_up_answer,battle_result,previous_match')
          .eq('id', task_id).eq('user_id', user_id).maybeSingle();
        if (error) throw error;
        return data as unknown as SummaryTask | null;
      },
      async translation(task_id, language, source_hash) {
        const { data, error } = await db.from('coaching_translations').select('translation')
          .match({ task_id, language, source_hash }).maybeSingle();
        if (error) throw error;
        return (data?.translation ?? undefined) as Record<string, string> | undefined;
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
        const { error } = await db.from('trial_coaching_followup')
          .update({ summary_sent_at: new Date().toISOString(), summary_message_id: messageId })
          .eq('user_id', user_id).eq('subscription_id', subscription_id);
        if (error) throw error;
      },
    });
  } catch {
    console.error('Trial coaching summary could not be delivered or recorded');
    return new Response(null, { status: 503 });
  }
});
