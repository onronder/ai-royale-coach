import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { z } from 'npm:zod@3';
import { Output, streamText } from 'npm:ai@6';
import { createOpenAI } from 'npm:@ai-sdk/openai@3';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { checkAiAccess } from '../_shared/ai-access.ts';
import { firstTaskBattle, normalizeTag } from '../_shared/coaching-match.ts';
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayResponseHeaders } from '../_shared/run-id.ts';
const Input = z.object({ playerTag:z.string().regex(/^#?[0289PYLQGRJCUV]{3,15}$/i), action:z.enum(['get','start','shown','check','follow-up']), language:z.enum(['en','tr','es','fr','pt']).default('en'), question:z.string().trim().min(1).max(500).optional() });
const Suggestion = z.object({ remove_id:z.number(), add_id:z.number(), reason:z.string(), practice:z.string() });
const Answer = z.object({ answer:z.string(), alternative_id:z.number().nullable(), reason:z.string().nullable(), practice:z.string().nullable() });
const reply = (data:unknown,status=200,headers?:HeadersInit) => new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json',...Object.fromEntries(new Headers(headers))}});
async function handleRequest(req: Request): Promise<Response> {
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), aiKey=Deno.env.get('LOVABLE_API_KEY');
 if(!url||!key||!aiKey) return reply({error:'Service configuration unavailable'},500);
 const db=createClient(url,key);
 const {data:{user}}=await db.auth.getUser(req.headers.get('authorization')?.replace(/^Bearer /i,'') || '');
 if(!user) return reply({error:'Unauthorized'},401);
 const parsed=Input.safeParse(await req.json().catch(()=>null));
 if(!parsed.success) return reply({error:'Invalid coaching request'},400);
 const {action,language,question}=parsed.data; const tag=normalizeTag(parsed.data.playerTag);
 const {data:owner,error:ownerError}=await db.from('player_profiles').select('id,ai_enabled').eq('user_id',user.id).eq('player_tag',tag).maybeSingle();
 if(ownerError||!owner) return reply({error:'Linked player required'},403);
 const access=await checkAiAccess(db,user.id,'first-session-coaching',false);
 let {data:task,error:readError}=await db.from('coaching_tasks').select('*').eq('user_id',user.id).eq('player_tag',tag).maybeSingle();
 if(readError) return reply({error:'Unable to load task'},503);
 if(action==='get') return reply({task,read_only:!access.allowed});
 if(!access.allowed) return reply({error:'Subscription required',subscription_required:true},403);
 if(!access.isTrial&&!access.isAdmin&&!owner.ai_enabled) return reply({error:'AI not enabled for this player'},403);
 let reservationId:string|undefined; let generationOwned=false; let followUpOwned=false;
 const event=async(name:string,props:Record<string,unknown>)=>{await db.from('product_events').insert({user_id:user.id,event_name:name,props:{player_tag:tag,...props}});};
 const gameData=async(type:'player'|'battles',force=false)=>{
   const {data,error}=await db.functions.invoke('clash-royale-api',{body:{endpoint:type,playerTag:tag,forceRefresh:force}});
   if(error) throw new Error('Game data unavailable');
   return data;
 };
 const ai=async<T>(prompt:string,schema:z.ZodType<T>)=>{
   const run=createLovableAiGatewayRunIdFetch();
   const provider=createOpenAI({apiKey:aiKey,baseURL:'https://ai.gateway.lovable.dev/v1',headers:{'Lovable-API-Key':aiKey,'X-Lovable-AIG-SDK':'vercel-ai-sdk'},fetch:run.fetch});
   const result=streamText({model:provider.responses('openai/gpt-6-astra'),system:`You are a Clash Royale coach. Respond in ${language}. Card names stay in English. Only use supplied collection IDs and actual card levels. Logs do not reveal placement, elixir use or timing: never invent observed gameplay. Give short, specific advice; do not promise wins or trophies.`,messages:[{role:'user',content:prompt}],output:Output.object({schema}),abortSignal:req.signal,maxRetries:0,providerOptions:{openai:{store:false,forceReasoning:true,reasoningEffort:'low',reasoningSummary:'auto',include:['reasoning.encrypted_content']}}});
   const output=await result.output; const usage=await result.usage; const response=await result.response;
   if(!output) throw new Error('AI returned no coaching advice');
   return {output,usage,runId:run.getRunId(),headers:getLovableAiGatewayResponseHeaders(response.headers,corsHeaders)};
 };
 try {
   if(action==='shown') {
     if(task?.recommendation&&!task.shown_at) {
       const {data:updated,error}=await db.from('coaching_tasks').update({shown_at:new Date().toISOString()}).eq('id',task.id).is('shown_at',null).select('*').maybeSingle();
       if(error) throw error;
       if(updated){task=updated;await event('ai_recommendation_viewed',{task_id:task.id});}
     }
     return reply({task});
   }
   if(action==='check') {
     if(!task?.shown_at||!task.recommended_deck) return reply({task});
     if(task.battle_result) return reply({task});
     const battles=await gameData('battles',true);
     if(!Array.isArray(battles)) throw new Error('Battle history unavailable');
     const {data:cache}=await db.from('player_cache').select('battles_fetched_at').eq('player_tag',tag).maybeSingle();
     const match=firstTaskBattle(tag,task.shown_at,task.recommended_deck as {id:number}[],battles);
     const update={last_checked_at:new Date().toISOString(),battles_fetched_at:cache?.battles_fetched_at,...(match?{matched_battle_key:match.key,battle_result:match,status:'completed'}:{})};
     const {data:updated,error}=await db.from('coaching_tasks').update(update).eq('id',task.id).is('matched_battle_key',null).select('*').maybeSingle();
     if(error) throw error;
     if(updated) task=updated;
     if(match&&updated) await event('coaching_first_match',{task_id:task.id,outcome:match.outcome,api_observation_delay_seconds:Math.max(0,(Date.now()-Date.parse(match.battle_time))/1000)});
     return reply({task});
   }
   if(action==='follow-up') {
     if(!question||!task?.recommendation) return reply({error:'Question and existing recommendation required'},400);
     if(task.follow_up_answer) return reply({task});
     if(task.follow_up_started_at&&Date.now()-Date.parse(task.follow_up_started_at)<180000) return reply({error:'Question already in progress'},409);
     const stamp=new Date().toISOString();
     let claim=db.from('coaching_tasks').update({follow_up_started_at:stamp,follow_up_question:question}).eq('id',task.id).is('follow_up_answer',null);
     claim=task.follow_up_started_at?claim.eq('follow_up_started_at',task.follow_up_started_at):claim.is('follow_up_started_at',null);
     const {data:locked,error}=await claim.select('*').maybeSingle();
     if(error) throw error; if(!locked) return reply({error:'Question already in progress'},409);
     task=locked;followUpOwned=true;
     const player=await gameData('player');
     const generated=await ai(`One included follow-up about this recommendation only. If unrelated, redirect to the recommendation. If suggesting an alternative, choose one owned card outside the other seven cards. Set alternative_id to null unless changing the recommended swap. When changing the swap supply a new reason and practice tip for that card; otherwise set reason and practice to null. Recommendation: ${JSON.stringify(task.recommendation)}; original deck: ${JSON.stringify(task.source_deck)}; proposed deck: ${JSON.stringify(task.recommended_deck)}; collection: ${JSON.stringify(player.cards)}. Question: ${question}`,Answer);
     const a=generated.output.alternative_id;
     let deck=task.recommended_deck as {id:number}[];
     if(a!==null) {
       const original=task.source_deck as {id:number}[]; const rec=task.recommendation as {remove_id:number;add_id:number};
       const alternative=player.cards?.find((c:{id:number})=>c.id===a);
       if(!alternative||original.some(c=>c.id!==rec.remove_id&&c.id===a)||a===rec.remove_id||!generated.output.reason||!generated.output.practice) throw new Error('Invalid alternative returned');
       deck=original.map(c=>c.id===rec.remove_id?alternative:c);
     }
     const {data:updated,error:saveError}=await db.from('coaching_tasks').update({follow_up_answer:generated.output.answer,recommended_deck:deck,...(a!==null?{recommendation:{...(task.recommendation as Record<string,unknown>),add_id:a,reason:generated.output.reason,practice:generated.output.practice},shown_at:null,matched_battle_key:null,battle_result:null,status:'ready'}:{}),prompt_tokens:task.prompt_tokens+(generated.usage.inputTokens||0),completion_tokens:task.completion_tokens+(generated.usage.outputTokens||0),ai_calls:task.ai_calls+1}).eq('id',task.id).select('*').single();
     if(saveError) throw saveError;
     await event('coaching_follow_up',{task_id:task.id,gateway_run_id:generated.runId});
     return reply({task:updated},200,generated.headers);
   }
   // The initial task is persistent: repeat start, reload and double taps return it rather than generating again.
   if(task?.recommendation) return reply({task});
   if(task?.status==='generating'&&task.generation_started_at&&Date.now()-Date.parse(task.generation_started_at)<180000) return reply({error:'Task already in progress'},409);
   const stamp=new Date().toISOString();
   if(!task){const {data:created,error}=await db.from('coaching_tasks').insert({user_id:user.id,player_tag:tag,language,generation_started_at:stamp}).select('*').single();if(error)return reply({error:'Task already in progress'},409);task=created;}
   else {const {data:locked,error}=await db.from('coaching_tasks').update({status:'generating',generation_started_at:stamp}).eq('id',task.id).eq('status',task.status).select('*').maybeSingle();if(error)throw error;if(!locked)return reply({error:'Task already in progress'},409);task=locked;}
   generationOwned=true;
   const player=await gameData('player',true);
   if(!Array.isArray(player.currentDeck)||player.currentDeck.length!==8||!Array.isArray(player.cards)) throw new Error('Current deck and collection required');
   if(access.isTrial){const {data:r,error}=await db.rpc('reserve_trial_ai',{p_user_id:user.id,p_request_key:`coaching:${task.id}`,p_feature:'first-session-coaching'});if(error)throw error;if(!r?.allowed){await db.from('coaching_tasks').update({status:'failed'}).eq('id',task.id);await event('trial_quota_denied',{task_id:task.id,next_available_at:r?.next_available_at});return reply({error:r?.in_progress?'Analysis already in progress':'Trial limit: 1 AI analysis per 24 hours',trial_limit:!r?.in_progress,next_available_at:r?.next_available_at},r?.in_progress?409:429);}reservationId=r.id;}
   const generated=await ai(`Choose exactly one card change for a one-match practice task using current deck and available collection, considering real levels. Return remove_id from deck and add_id from owned collection outside deck, concise reason, and one practice tip. Current deck: ${JSON.stringify(player.currentDeck)}. Collection: ${JSON.stringify(player.cards)}.`,Suggestion);
   const suggestion=generated.output;
   const removed=player.currentDeck.find((c:{id:number})=>c.id===suggestion.remove_id);const added=player.cards.find((c:{id:number})=>c.id===suggestion.add_id);
   if(!removed||!added||player.currentDeck.some((c:{id:number})=>c.id===added.id)) throw new Error('AI suggested an invalid card swap');
   const deck=player.currentDeck.map((c:{id:number})=>c.id===removed.id?added:c);
   const {data:updated,error}=await db.from('coaching_tasks').update({status:'ready',source_deck:player.currentDeck,recommended_deck:deck,recommendation:suggestion,prompt_tokens:generated.usage.inputTokens||0,completion_tokens:generated.usage.outputTokens||0,ai_calls:1}).eq('id',task.id).select('*').single();
   if(error) throw error;
   if(reservationId){const {error:finishError}=await db.rpc('finish_trial_ai',{p_id:reservationId,p_success:true});if(finishError)throw finishError;}
   await event('coaching_generated',{task_id:task.id,gateway_run_id:generated.runId,model:'openai/gpt-6-astra',input_tokens:generated.usage.inputTokens,output_tokens:generated.usage.outputTokens});
   return reply({task:updated},200,generated.headers);
 }catch(e){
   if(reservationId) await db.rpc('finish_trial_ai',{p_id:reservationId,p_success:false});
   if(generationOwned&&task)await db.from('coaching_tasks').update({status:'failed'}).eq('id',task.id).is('recommendation',null);
   if(followUpOwned&&task)await db.from('coaching_tasks').update({follow_up_started_at:null}).eq('id',task.id).is('follow_up_answer',null);
   await event('ai_generation_failed',{task_id:task?.id,action});
   const status=typeof e==='object'&&e!==null&&'statusCode'in e?Number(e.statusCode):500;
   return reply({error:e instanceof Error?e.message:'Coaching unavailable'},[400,401,402,403,404,429].includes(status)?status:500);
 }
}

// Keep the browser connection alive while the upstream stream is consumed and the task is saved.
// NDJSON carries the final status explicitly because headers are already sent.
Deno.serve(async req => {
 if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
 const encoder = new TextEncoder();
 const stream = new ReadableStream({
   async start(controller) {
     const heartbeat = setInterval(() => controller.enqueue(encoder.encode('{"progress":true}\n')), 5000);
     try {
       controller.enqueue(encoder.encode('{"progress":true}\n'));
       const response = await handleRequest(req);
       const data = await response.json();
       controller.enqueue(encoder.encode(JSON.stringify({ status: response.status, data }) + '\n'));
     } catch (error) {
       controller.enqueue(encoder.encode(JSON.stringify({ status: 500, data: { error: error instanceof Error ? error.message : 'Coaching unavailable' } }) + '\n'));
     } finally { clearInterval(heartbeat); controller.close(); }
   },
 });
 return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' } });
});
