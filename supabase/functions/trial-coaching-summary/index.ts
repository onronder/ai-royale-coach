import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { resendProvider, sqlStore } from '../_shared/email-attempt.ts';
import { deliverSummary, type SummaryTask } from './summary.ts';

Deno.serve(async req => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(fn as never, args as never);
    if (error) throw error;
    return data;
  };
  try {
    return await deliverSummary(req, sqlStore(rpc, 'summary'), resendProvider(Deno.env.get('RESEND_API_KEY')!), {
      async task(taskId, userId) {
        const { data, error } = await db.from('coaching_tasks')
          .select('id,language,source_deck,recommended_deck,recommendation,follow_up_question,follow_up_answer,battle_result,previous_match')
          .eq('id', taskId).eq('user_id', userId).maybeSingle();
        if (error) throw error;
        return data as unknown as SummaryTask | null;
      },
      async translation(task_id, language, source_hash) {
        const { data, error } = await db.from('coaching_translations').select('translation')
          .match({ task_id, language, source_hash }).maybeSingle();
        if (error) throw error;
        return (data?.translation ?? undefined) as Record<string, string> | undefined;
      },
    });
  } catch {
    console.error('Trial coaching summary could not be delivered or recorded');
    return new Response(null, { status: 503 });
  }
});
