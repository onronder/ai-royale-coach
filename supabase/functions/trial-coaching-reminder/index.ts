import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { resendProvider, sqlStore } from '../_shared/email-attempt.ts';
import { deliverReminder } from './delivery.ts';

Deno.serve(async req => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(fn as never, args as never);
    if (error) throw error;
    return data;
  };
  try {
    return await deliverReminder(req, sqlStore(rpc, 'reminder'), resendProvider(Deno.env.get('RESEND_API_KEY')!));
  } catch {
    console.error('Trial coaching reminder could not be delivered or recorded');
    return new Response(null, { status: 503 });
  }
});
