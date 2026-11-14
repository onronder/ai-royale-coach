import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, RefreshCw, Send, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ClashRoyaleCard } from '@/services/clashRoyaleApi';
interface Task { id:string; status:string; source_deck:ClashRoyaleCard[]; recommended_deck:ClashRoyaleCard[]; recommendation:{remove_id:number;add_id:number;reason:string;practice:string}|null; shown_at:string|null; follow_up_answer:string|null; follow_up_question:string|null; last_checked_at:string|null; battles_fetched_at:string|null; battle_result:{outcome:'win'|'loss'|'draw';score:number[];trophy_change:number|null;opponent_deck:ClashRoyaleCard[]}|null; }
export function FirstSessionTask({userId,playerTag}:{userId:string;playerTag:string}) {
 const {t,i18n}=useTranslation(); const {hasAccess,isLoading:accessLoading}=useSubscription();
 const qc=useQueryClient(); const key=['coaching-task',userId,playerTag];
 const [busy,setBusy]=useState<string|null>(null);const [question,setQuestion]=useState('');const [error,setError]=useState('');const shown=useRef<string|null>(null);
 const invoke=async(action:string)=>{
   const {data,error:err}=await supabase.functions.invoke('first-session-coaching',{body:{playerTag,action,language:i18n.language.split('-')[0],...(action==='follow-up'?{question}: {})}});
   if(err){const detail=err.context instanceof Response?await err.context.json().catch(()=>null):null;
     throw new Error(detail?.trial_limit?t('coaching.quota',{time:detail.next_available_at?new Date(detail.next_available_at).toLocaleString(i18n.language):'—'}):detail?.error||err.message);}
   return data as {task:Task|null};
 };
 const query=useQuery({queryKey:key,queryFn:()=>invoke('get'),retry:false,refetchOnWindowFocus:true});const task=query.data?.task;
 const run=async(action:string)=>{if(busy)return;setBusy(action);setError('');try{qc.setQueryData(key,await invoke(action));}catch(e){setError(e instanceof Error?e.message:t('coaching.error'));}finally{setBusy(null);}};
 useEffect(()=>{if(task?.recommendation&&!task.shown_at&&hasAccess&&shown.current!==task.id){shown.current=task.id;invoke('shown').then(data=>qc.setQueryData(key,data)).catch(()=>{shown.current=null;});}},[task?.id,task?.shown_at,hasAccess]);
 const time=(value:string|null|undefined)=>value?new Date(value).toLocaleString(i18n.language):t('coaching.never');
 const card=(c:ClashRoyaleCard,label?:string)=><div key={c.id} className="min-w-0 text-center">{label&&<p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>}<img src={c.iconUrls?.medium} alt={c.name} className="mx-auto aspect-[3/4] w-full max-w-20 object-contain" loading="lazy"/><p className="mt-1 break-words text-xs font-semibold leading-tight">{c.name}</p>{label&&<p className="mt-1 text-xs text-muted-foreground">{t('coaching.level',{level:c.level+(16-(c.maxLevel??16))})}</p>}</div>;
 const removed=task?.source_deck?.find(c=>c.id===task.recommendation?.remove_id);
 const added=task?.recommended_deck?.find(c=>!task.source_deck.some(original=>original.id===c.id));
 const result=task?.battle_result;
 return <section aria-label={t('coaching.intro')} className="mb-6 min-w-0 border-b border-border pb-6">
  <div className="mb-4 flex items-center gap-3"><Swords className="h-6 w-6 shrink-0 text-gold"/><div><p className="text-xs font-semibold text-muted-foreground">{t('coaching.intro')}</p><h2 className="font-rajdhani text-2xl font-bold">{t('coaching.title')}</h2></div></div>
  {(query.isLoading||accessLoading)?<p className="text-sm text-muted-foreground">{t('coaching.loading')}</p>:task?.recommendation?<>
   <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <div>{removed&&added&&<div className="mb-4 flex items-center justify-center gap-5"> <div className="w-24">{card(removed,t('coaching.remove'))}</div><ArrowRight className="h-5 w-5 shrink-0 text-primary"/><div className="w-24">{card(added,t('coaching.add'))}</div></div>}
     <p className="break-words text-sm leading-relaxed">{task.recommendation.reason}</p><p className="mt-3 text-sm"><span className="font-semibold text-primary">{t('coaching.practice')}: </span>{task.recommendation.practice}</p>
     <h3 className="mb-3 mt-5 text-sm font-semibold">{t('coaching.ready')}</h3><div className="grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-4">{task.recommended_deck.map(c=>card(c))}</div>
    </div>
    <div className="min-w-0">
     {task.follow_up_answer?<div className="border-l-2 border-primary pl-4"><h3 className="mb-2 text-sm font-semibold">{t('coaching.saved')}</h3><p className="mb-2 break-words text-sm text-muted-foreground">{task.follow_up_question}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{task.follow_up_answer}</p></div>:<form onSubmit={e=>{e.preventDefault();void run('follow-up');}}><label htmlFor="task-question" className="mb-2 block text-sm font-semibold">{t('coaching.followUp')}</label><Textarea id="task-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={500} placeholder={t('coaching.placeholder')} disabled={!hasAccess||!!busy}/><Button type="submit" variant="outline" disabled={!hasAccess||!!busy||!question.trim()} className="mt-3 h-auto min-h-11 w-full whitespace-normal py-2"><Send/>{t('coaching.ask')}</Button></form>}
     <div className="mt-6 border-t border-border pt-5" aria-live="polite">{result?<><h3 className="text-sm font-semibold">{t('coaching.result')}</h3><div className="my-3 flex items-baseline gap-4"><strong className="font-rajdhani text-3xl">{result.score.join(' – ')}</strong><span className={result.outcome==='win'?'text-success':result.outcome==='loss'?'text-destructive':'text-muted-foreground'}>{t(`coaching.${result.outcome}`)}</span></div>{result.trophy_change!==null&&<p className="text-sm">{t('coaching.trophies')}: {result.trophy_change>0?'+':''}{result.trophy_change}</p>}<h4 className="mb-2 mt-4 text-sm font-semibold">{t('coaching.opponent')}</h4><div className="grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-4">{result.opponent_deck.map(c=>card(c))}</div><p className="mt-4 text-sm text-muted-foreground"><span className="font-semibold">{t('coaching.next')}: </span>{t(result.outcome==='win'?'coaching.nextWin':result.outcome==='loss'?'coaching.nextLoss':'coaching.nextDraw')}</p></>:<><p className="mb-3 text-sm font-semibold">{t('coaching.waiting')}</p><Button variant="outline" onClick={()=>void run('check')} disabled={!hasAccess||!!busy} className="h-auto min-h-11 w-full whitespace-normal py-2">{busy==='check'?<Loader2 className="animate-spin"/>:<RefreshCw/>}{t('coaching.check')}</Button></>}
      <p className="mt-3 text-xs text-muted-foreground">{t('coaching.checked',{time:time(task.last_checked_at)})}</p>{task.battles_fetched_at&&<p className="mt-1 text-xs text-muted-foreground">{t('coaching.observed',{time:time(task.battles_fetched_at)})}</p>
     </div>
    </div>
   </div>
  </>:hasAccess?<Button onClick={()=>void run('start')} disabled={!!busy} className="h-auto min-h-11 whitespace-normal py-2">{busy?<Loader2 className="animate-spin"/>:<Swords/>}{busy?t('coaching.preparing'):t('coaching.start')}</Button>:null}
  {!accessLoading&&!hasAccess&&<p className="mt-4 text-sm text-muted-foreground">{t('coaching.expired')}</p>}
  {(error||query.error)&&<div role="alert" className="mt-4 flex flex-wrap items-center gap-3"><p className="min-w-0 break-words text-sm text-destructive">{error||t('coaching.error')}</p><Button size="icon" variant="ghost" aria-label={t('common.retry')} onClick={()=>void query.refetch()}><RefreshCw/></Button></div>}
 </section>;
}
