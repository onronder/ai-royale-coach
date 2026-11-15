import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, Loader2, RefreshCw, Send, Swords, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DeckTransfer } from './DeckTransfer';
import { ClashRoyaleCard } from '@/services/clashRoyaleApi';
import { getDisplayLevel } from '@/utils/cardLevelCalculator';
import type { TrophySnapshot } from '@/lib/battleTrophies';
import { coachingSwap, swapStatement, tacticalText } from '../../../supabase/functions/_shared/coaching-advice';

interface Task { id:string; status:string; source_deck:ClashRoyaleCard[]; recommended_deck:ClashRoyaleCard[]; recommendation:{remove_id:number;add_id:number;reason:string;practice:string;verified_swap?:boolean;follow_up_verified?:boolean}|null; shown_at:string|null; follow_up_answer:string|null; follow_up_question:string|null; last_checked_at:string|null; battles_fetched_at:string|null; battle_result:{outcome:'win'|'loss'|'draw';score:number[];trophy_change:number|null;opponent_deck:ClashRoyaleCard[]}|null; }
interface DeckConfirmation { cards: ClashRoyaleCard[]; from_battle: boolean }
export function FirstSessionTask({userId,playerTag,collection,onMatchResult}:{
 userId:string;playerTag:string;collection:ClashRoyaleCard[];onMatchResult:(snapshot?:TrophySnapshot)=>Promise<unknown>;
}) {
 const {t,i18n}=useTranslation(); const {hasAccess,isLoading:accessLoading}=useSubscription();
 const qc=useQueryClient(); const key=['coaching-task',userId,playerTag];
 const [busy,setBusy]=useState<string|null>(null);const [question,setQuestion]=useState('');const [error,setError]=useState('');const shown=useRef<string|null>(null);
 const [confirmation,setConfirmation]=useState<DeckConfirmation|null>(null);
 const invoke=async(action:string,confirmedDeckIds?:number[])=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session) throw new Error(t('coaching.error'));
   const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/first-session-coaching`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({playerTag,action,confirmedDeckIds,language:i18n.language.split('-')[0],...(action==='follow-up'?{question}: {})})});
   const reader=response.body?.getReader(); if(!reader)throw new Error(t('coaching.error'));
   const decoder=new TextDecoder();let buffer='';let final:{status:number;data:{task:Task|null;trophy_snapshot?:TrophySnapshot;deck_confirmation?:DeckConfirmation;error?:string;deck_unavailable?:boolean}}|undefined;
   while(true){const chunk=await reader.read();buffer+=decoder.decode(chunk.value,{stream:!chunk.done});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(line.trim()){const item=JSON.parse(line);if(item.status)final=item;}}if(chunk.done)break;}
   if(!final)throw new Error(t('coaching.error'));
   if(final.status>=400){const detail=final.data;throw new Error(detail.deck_unavailable?t('coaching.unavailable'):detail.error||t('coaching.error'));}
   return final.data;
 };
 const query=useQuery({queryKey:key,queryFn:()=>invoke('get'),retry:false,refetchOnWindowFocus:true});const task=query.data?.task;
 const run=async(action:string,confirmedDeckIds?:number[])=>{
   if(busy)return;
   setBusy(action);
   setError('');
   try{
     const data=await invoke(action,confirmedDeckIds);
     setConfirmation(data.deck_confirmation??null);
     qc.setQueryData(key,data);
     if(action==='check' && data.task?.battle_result) {
       try { await onMatchResult(data.trophy_snapshot ?? undefined); }
       catch { setError(t('coaching.profileRefreshError')); }
     }
   }catch(e){
     setError(e instanceof Error?e.message:t('coaching.error'));
   }finally{setBusy(null);}
 };
 useEffect(()=>{const revision=task?`${task.id}:${task.recommendation?.add_id}`:null;if(task?.recommendation&&!task.shown_at&&hasAccess&&shown.current!==revision){shown.current=revision;invoke('shown').then(data=>qc.setQueryData(key,data)).catch(()=>{shown.current=null;});}},[task?.id,task?.shown_at,task?.recommendation?.add_id,hasAccess]);
 const time=(value:string|null|undefined)=>value?new Date(value).toLocaleString(i18n.language):t('coaching.never');
 const card = (c: ClashRoyaleCard, label?: string) => (
   <div key={c.id} className="min-w-0 text-center">
     {label && <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>}
     <img src={c.iconUrls?.medium} alt="" width={60} height={72} loading="lazy" decoding="async"
       className="mx-auto h-[4.5rem] w-full max-w-[3.75rem] object-contain" />
     <p className="mt-1 break-words text-xs font-semibold leading-tight">{c.name}</p>
     {label && <p className="mt-1 text-xs text-muted-foreground">{t('coaching.level', { level: getDisplayLevel(c) })}</p>}
   </div>
 );
 const swap = task?.recommendation && coachingSwap(task.source_deck, task.recommended_deck, task.recommendation.remove_id);
 const removed = swap?.removed;
 const added = swap?.added;
 const rec = task?.recommendation;
 const verified = !!rec?.verified_swap && rec.add_id === added?.id;
 const facts = swap ? swapStatement(swap.removed, swap.added, i18n.language) : '';
 const knownCards = [...collection, ...(task?.source_deck ?? []), ...(task?.recommended_deck ?? [])];
 const legacyTip = (text:string) => added ? tacticalText(text, added, knownCards) : '';
 const reason = rec && (verified ? rec.reason : [facts, legacyTip(rec.reason)].filter(Boolean).join(' '));
 const practice = rec && (verified ? rec.practice : legacyTip(rec.practice));
 const answer = task?.follow_up_answer && (rec?.follow_up_verified ? task.follow_up_answer :
   [facts, legacyTip(task.follow_up_answer)].filter(Boolean).join(' '));
 const result=task?.battle_result;
 const deckGrid = "grid grid-cols-4 gap-x-2 gap-y-3";
 const disclosure = "group rounded-lg border border-border bg-background/40";
 const summary = "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-muted/50 focus-visible:outline focus-visible:outline-primary [&::-webkit-details-marker]:hidden";
 const chevron = <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />;
 const followUp = task?.follow_up_answer ? (
   <details className={disclosure}>
     <summary className={summary}>{t('coaching.saved')}{chevron}</summary>
     <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed">
       <p className="break-words text-muted-foreground">{task.follow_up_question}</p>
       <p className="whitespace-pre-wrap break-words">{answer}</p>
     </div>
   </details>
 ) : hasAccess && (
   <form onSubmit={e => { e.preventDefault(); void run('follow-up'); }} className="space-y-2">
     <label htmlFor="task-question" className="text-sm font-semibold">{t('coaching.followUp')}</label>
     <Textarea id="task-question" value={question} onChange={e => setQuestion(e.target.value)}
       maxLength={500} placeholder={t('coaching.placeholder')} disabled={!!busy}/>
     <Button type="submit" variant="outline" disabled={!!busy || !question.trim()} className="h-auto min-h-11 whitespace-normal">
       <Send aria-hidden/>{t('coaching.ask')}
     </Button>
   </form>
 );
 return <section aria-label={t('coaching.intro')} className="mb-6 min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
  <header className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-gold/10 to-transparent px-4 py-4 sm:px-6">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold"><Swords aria-hidden className="h-5 w-5"/></span>
    <div>
      <p className="text-xs font-medium text-muted-foreground">{t('coaching.intro')}</p>
      <h2 className="font-rajdhani text-2xl font-bold leading-tight">{t(result ? 'coaching.result' : 'coaching.title')}</h2>
    </div>
  </header>
  <div className="space-y-4 p-4 sm:p-6">
  {(query.isLoading||accessLoading)?<p role="status" className="text-sm text-muted-foreground">{t('coaching.loading')}</p>:task?.recommendation?<>
   {result && <div aria-live="polite" className="grid gap-3 rounded-lg border border-border bg-background/60 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6">
     <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
       <strong className="font-rajdhani text-4xl leading-none tabular-nums">{result.score.join(' – ')}</strong>
       <span className={result.outcome==='win'?'font-semibold text-success':result.outcome==='loss'?'font-semibold text-destructive':'font-semibold'}>{t('coaching.'+result.outcome)}</span>
       {result.trophy_change !== null && <span className="inline-flex items-center gap-1 rounded-md bg-gold/10 px-2 py-1 text-sm font-semibold text-gold">
         <Trophy aria-hidden className="h-4 w-4"/><span className="sr-only">{t('coaching.trophies')} </span>{result.trophy_change>0?'+':''}{result.trophy_change}
       </span>}
     </div>
     <div className="sm:border-l sm:border-border sm:pl-5"><h3 className="text-sm font-semibold">{t('coaching.next')}</h3>
       <p className="text-sm leading-relaxed text-muted-foreground">{t(result.outcome==='win'?'coaching.nextWin':result.outcome==='loss'?'coaching.nextLoss':'coaching.nextDraw')}</p>
     </div>
   </div>}
   <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
     <div className="min-w-0 space-y-4">
       {removed && added && <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-lg border border-border bg-muted/25 px-3 py-3">
         {card(removed,t('coaching.remove'))}<ArrowRight aria-hidden className="h-5 w-5 text-primary"/>{card(added,t('coaching.add'))}
       </div>}
       {reason && <p className="break-words text-sm leading-relaxed">{reason}</p>}
       {practice && <div><h3 className="mb-1 text-sm font-semibold text-primary">{t(result?'coaching.practiceTip':'coaching.practice')}</h3>
         <p className="break-words text-sm leading-relaxed">{practice}</p></div>}
     </div>
     <div className="min-w-0 space-y-3">
       <h3 className="text-sm font-semibold">{t(result?'coaching.playedDeck':'coaching.ready')}</h3>
       <div className={deckGrid}>{task.recommended_deck.map(c=>card(c))}</div>
       <DeckTransfer cards={task.recommended_deck} playerTag={playerTag}/>
       {!result && hasAccess && <div className="rounded-lg border border-primary/25 bg-primary/5 p-3" aria-live="polite">
         <p className="text-sm font-semibold">{t('coaching.waiting')}</p>
         <p className="mb-3 mt-1 text-sm text-muted-foreground">{t('coaching.syncHint')}</p>
         <Button onClick={()=>void run('check')} disabled={!!busy} className="h-auto min-h-11 w-full whitespace-normal">
           {busy==='check'?<Loader2 className="animate-spin"/>:<RefreshCw/>}{t('coaching.check')}
         </Button>
       </div>}
     </div>
   </div>
   <div className="grid items-start gap-3 border-t border-border pt-4 lg:grid-cols-2">
     {result && result.opponent_deck.length>0 && <details className={disclosure}>
       <summary className={summary}>{t('coaching.opponent')}{chevron}</summary>
       <div className={deckGrid+" p-3"}>{result.opponent_deck.map(c=>card(c))}</div>
     </details>}
     {followUp}
   </div>
   {(task.last_checked_at || task.battles_fetched_at) && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
     {task.last_checked_at && <span>{t('coaching.checked',{time:time(task.last_checked_at)})}</span>}
     {task.battles_fetched_at && <span>{t('coaching.observed',{time:time(task.battles_fetched_at)})}</span>}
   </div>}
  </>:hasAccess&&confirmation?<div className="space-y-3" aria-live="polite">
    <p className="text-sm">{t(confirmation.from_battle?'coaching.partialDeck':'coaching.changedDeck')}</p>
    <div className="grid max-w-lg grid-cols-4 gap-3">{confirmation.cards.map(c=>card(c))}</div>
    <div className="flex flex-wrap gap-2">
      <Button disabled={!!busy} onClick={()=>void run('start',confirmation.cards.map(c=>c.id))}>{busy?t('coaching.preparing'):t('coaching.confirmDeck')}</Button>
      <Button variant="outline" disabled={!!busy} onClick={()=>setConfirmation(null)}>{t('common.cancel')}</Button>
    </div>
  </div>:hasAccess&&!query.error?<Button onClick={()=>void run('start')} disabled={!!busy} className="h-auto min-h-11 whitespace-normal py-2">{busy?<Loader2 className="animate-spin"/>:<Swords/>}{busy?t('coaching.preparing'):t('coaching.start')}</Button>:null}
  {!accessLoading&&!hasAccess&&<p className="mt-4 text-sm text-muted-foreground">{t('coaching.expired')}</p>}
  {(error||query.error)&&<div role="alert" className="mt-4 flex flex-wrap items-center gap-3"><p className="min-w-0 break-words text-sm text-destructive">{error||t('coaching.error')}</p>{(query.error || error === t('coaching.profileRefreshError')) && <Button size="icon" variant="ghost" aria-label={t('common.retry')} onClick={()=>{ if(task?.battle_result && error === t('coaching.profileRefreshError')) void run('check'); else void query.refetch(); }}><RefreshCw/></Button>}</div>}
  </div></section>;
}
