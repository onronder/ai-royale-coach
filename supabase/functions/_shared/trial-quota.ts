import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { checkAiAccess } from './ai-access.ts';
import { errorResponse, jsonResponse } from './cors.ts';
import { successfulChatStream } from './trial-stream.ts';
export async function withTrialQuota(req: Request, feature: string, handler: (req: Request) => Promise<Response>): Promise<Response> {
  if (req.method === 'OPTIONS') return handler(req);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return errorResponse('Service configuration unavailable', 500);
  const db = createClient(url,key);
  const token = req.headers.get('authorization')?.replace(/^Bearer /i,'');
  if (!token) return errorResponse('Unauthorized',401);
  const {data:{user}} = await db.auth.getUser(token);
  if (!user) return errorResponse('Unauthorized',401);
  const access = await checkAiAccess(db,user.id,feature,false);
  if (!access.allowed) return errorResponse('Subscription required',403,{subscription_required:true});
  // Paid quotas stay inside the original handler. Trial allowance counts only completed results.
  if (!access.isTrial) return handler(req);
  const body = await req.clone().text();
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${feature}:${body}`));
  const requestKey = Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2,'0')).join('');
  const {data:cached} = await db.from('ai_trial_reservations').select('response_data').eq('user_id',user.id).eq('request_key',requestKey).eq('status','completed').maybeSingle();
  if (cached?.response_data?.stream_text) return new Response(cached.response_data.stream_text,{headers:{...jsonResponse({}).headers,'Content-Type':'text/event-stream'}});
  if (cached?.response_data) return jsonResponse(cached.response_data);
  const {data:r,error} = await db.rpc('reserve_trial_ai',{p_user_id:user.id,p_request_key:requestKey,p_feature:feature});
  if (error) return errorResponse('Unable to reserve trial allowance',503);
  if (!r?.allowed) return errorResponse(r?.in_progress ? 'Analysis already in progress' : 'Trial limit: 1 AI analysis per 24 hours',r?.in_progress?409:429,{trial_limit:!r?.in_progress,next_available_at:r?.next_available_at});
  try {
    const response = await handler(req);
    if (!response.ok) { await db.rpc('finish_trial_ai',{p_id:r.id,p_success:false}); return response; }
    // Streaming chat commits only after the stream closes successfully.
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty AI stream');
      const decoder = new TextDecoder(); let text = '';
      const stream = new ReadableStream({async start(controller) {
        try { while (true) { const chunk=await reader.read(); if(chunk.done) break; text+=decoder.decode(chunk.value,{stream:true}); controller.enqueue(chunk.value); }
          text+=decoder.decode();
          const success=successfulChatStream(text);
          if(success)await db.from('ai_trial_reservations').update({response_data:{stream_text:text}}).eq('id',r.id);
          await db.rpc('finish_trial_ai',{p_id:r.id,p_success:success}); controller.close();
        } catch(e) { await db.rpc('finish_trial_ai',{p_id:r.id,p_success:false}); controller.error(e); }
      }, async cancel() { await reader.cancel(); await db.rpc('finish_trial_ai',{p_id:r.id,p_success:false}); }});
      return new Response(stream,{headers:response.headers,status:response.status});
    }
    const output = await response.clone().json();
    const noGeneration = output.fromCache === true || output.aiEnhanced === false;
    if (!noGeneration) await db.from('ai_trial_reservations').update({response_data:output}).eq('id',r.id);
    await db.rpc('finish_trial_ai',{p_id:r.id,p_success:!noGeneration});
    return response;
  } catch(e) { await db.rpc('finish_trial_ai',{p_id:r.id,p_success:false}); throw e; }
}
