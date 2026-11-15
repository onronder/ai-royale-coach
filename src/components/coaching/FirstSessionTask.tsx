import { useCardName } from '@/i18n/useCardName';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Loader2, RefreshCw, Send, Swords } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TrialFollowup } from './TrialFollowup';
import { DeckTransfer } from './DeckTransfer';
import { ClashRoyaleCard } from '@/services/clashRoyaleApi';
import { getDisplayLevel } from '@/utils/cardLevelCalculator';
import type { TrophySnapshot } from '@/lib/battleTrophies';
import { coachingSwap, swapStatement, tacticalText } from '../../../supabase/functions/_shared/coaching-advice';

interface MatchResult { outcome:'win'|'loss'|'draw'; score:number[]; trophy_change:number|null; opponent_deck:ClashRoyaleCard[] }
interface Task { id:string; language?:string; status:string; source_deck:ClashRoyaleCard[]; recommended_deck:ClashRoyaleCard[]; recommendation:{remove_id:number;add_id:number;reason:string;practice:string;verified_swap?:boolean;follow_up_verified?:boolean;language?:string;follow_up_language?:string}|null; shown_at:string|null; follow_up_answer:string|null; follow_up_question:string|null; last_checked_at:string|null; battles_fetched_at:string|null; battle_result:MatchResult|null; previous_match?:{ battle_result:MatchResult; recommended_deck:ClashRoyaleCard[] }|null; }
interface DeckConfirmation { cards: ClashRoyaleCard[]; from_battle: boolean }
export function FirstSessionTask({userId,playerTag,collection,onMatchResult}:{
 userId:string;playerTag:string;collection:ClashRoyaleCard[];onMatchResult:(snapshot?:TrophySnapshot)=>Promise<unknown>;
}) {
  const cardLabel = useCardName();
 const {t,i18n}=useTranslation(); const {hasAccess,isTrialActive,isLoading:accessLoading}=useSubscription();
 const qc=useQueryClient(); const key=['coaching-task',userId,playerTag];
 const [busy,setBusy]=useState<string|null>(null);const [question,setQuestion]=useState('');const [error,setError]=useState('');const shown=useRef<string|null>(null);
 const [confirmation,setConfirmation]=useState<DeckConfirmation|null>(null);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const invoke=async(action:string,confirmedDeckIds?:number[])=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session) throw new Error('auth.signInRequired');
   const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/first-session-coaching`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({playerTag,action,confirmedDeckIds,language:i18n.language.split('-')[0],...(action==='follow-up'?{question}: {})})});
   const reader=response.body?.getReader(); if(!reader)throw new Error('coaching.error');
   const decoder=new TextDecoder();let buffer='';let final:{status:number;data:{task:Task|null;trophy_snapshot?:TrophySnapshot;deck_confirmation?:DeckConfirmation;error?:string;deck_unavailable?:boolean}}|undefined;
   while(true){const chunk=await reader.read();buffer+=decoder.decode(chunk.value,{stream:!chunk.done});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(line.trim()){const item=JSON.parse(line);if(item.status)final=item;}}if(chunk.done)break;}
   if(!final)throw new Error('coaching.error');
   if (final.status >= 400) {
     if (final.data.deck_unavailable) throw new Error('coaching.unavailable');
     if (final.status === 401) throw new Error('auth.signInRequired');
     if (final.data.error === 'Subscription required') throw new Error('subscription.requiredForAI');
     if (final.data.error === 'AI not enabled for this player') throw new Error('subscription.aiNotEnabledForAccount');
     throw new Error('coaching.error');
   }
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
       catch { setError('coaching.profileRefreshError'); }
     }
   }catch(e){
     setConfirmation(null);
     setError(e instanceof Error && ['coaching.unavailable', 'auth.signInRequired', 'subscription.requiredForAI', 'subscription.aiNotEnabledForAccount'].includes(e.message) ? e.message : 'coaching.error');
   }finally{setBusy(null);}
 };
 useEffect(()=>{const revision=task?`${task.id}:${task.recommendation?.add_id}`:null;if(task?.recommendation&&!task.shown_at&&hasAccess&&shown.current!==revision){shown.current=revision;invoke('shown').then(data=>qc.setQueryData(key,data)).catch(()=>{shown.current=null;});}},[task?.id,task?.shown_at,task?.recommendation?.add_id,hasAccess]);
 const time=(value:string|null|undefined)=>value?new Date(value).toLocaleString(i18n.language):t('coaching.never');
 const card=(c:ClashRoyaleCard,label?:string)=><div key={c.id} className="min-w-0 text-center">{label&&<p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>}<img src={c.iconUrls?.medium} alt="" decoding="async" className="mx-auto aspect-[3/4] w-full max-w-20 object-contain" loading="lazy"/><p className="mt-1 break-words text-xs font-semibold leading-tight">{cardLabel(c.name)}</p>{label&&<p className="mt-1 text-xs text-muted-foreground">{t('coaching.level',{level:getDisplayLevel(c)})}</p>}</div>;
 const swap = task?.recommendation && coachingSwap(task.source_deck, task.recommended_deck, task.recommendation.remove_id);
 const removed = swap?.removed;
 const added = swap?.added;
 const rec = task?.recommendation;
 const verified = !!rec?.verified_swap && rec.add_id === added?.id;
 const facts = swap ? swapStatement(swap.removed, swap.added, i18n.language) : '';
 const adviceLanguage = rec?.language ?? task?.language;
 const answerLanguage = rec?.follow_up_language ?? task?.language;
 const savedLanguageLabel = (language?: string) => language && language !== i18n.resolvedLanguage &&
   <p className="mb-1 text-xs text-muted-foreground">{t('coachingHistory.language', { language: new Intl.DisplayNames([i18n.language], { type: 'language' }).of(language) })}</p>;
 const knownCards = [...collection, ...(task?.source_deck ?? []), ...(task?.recommended_deck ?? [])];
 const legacyTip = (text:string) => added ? tacticalText(text, added, knownCards, adviceLanguage ?? i18n.language) : '';
 const reason = rec && (verified ? rec.reason : [facts, legacyTip(rec.reason)].filter(Boolean).join(' '));
 const practice = rec && (verified ? rec.practice : legacyTip(rec.practice));
 const answer = task?.follow_up_answer && (rec?.follow_up_verified ? task.follow_up_answer :
   legacyTip(task.follow_up_answer) || facts);
 const result=task?.battle_result;
 const previous=task?.previous_match;
 const done=!!result;
 const step=!task?.recommendation?0:done?3:2;
 const outcomeTone=result?.outcome==='win'?'border-success/60 bg-success/10':result?.outcome==='loss'?'border-destructive/60 bg-destructive/10':'border-border bg-muted/30';
 const outcomeText=result?.outcome==='win'?'text-success':result?.outcome==='loss'?'text-destructive':'text-muted-foreground';
 const mini=(c:ClashRoyaleCard,highlight=false)=><div key={c.id} className="relative min-w-0 text-center"><img src={c.iconUrls?.medium} alt="" decoding="async" className={`mx-auto aspect-[3/4] w-full max-w-14 object-contain ${highlight?'rounded-md ring-2 ring-gold':''}`} loading="lazy"/>{highlight&&<span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-gold px-1 text-[10px] font-bold leading-4 text-gold-foreground">{t('coaching.newCard')}</span>}<p className="mt-1 break-words text-[11px] font-medium leading-tight">{cardLabel(c.name)}</p></div>;
 const steps=[t('coaching.stepSwap'),t('coaching.stepPlay'),t('coaching.stepResult')];
 const header=<div className="flex flex-wrap items-start justify-between gap-3">
  <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15"><Swords className="h-5 w-5 text-gold"/></div><div><p className="text-xs font-semibold text-muted-foreground">{t('coaching.intro')}</p><h2 className="font-rajdhani text-2xl font-bold leading-tight">{t('coaching.title')}</h2></div></div>
  {task?.recommendation&&<Badge variant="outline" className={done?outcomeText+' border-current':'text-primary border-primary/50'}>{done?<><CheckCircle2 className="mr-1 h-3.5 w-3.5"/>{t('coaching.statusDone')} · {t(`coaching.${result!.outcome}`)}</>:t('coaching.statusWaiting')}</Badge>}
 </div>;
 const stepper=task?.recommendation&&<ol className="mt-4 grid grid-cols-3 gap-2">{steps.map((label,idx)=>{const n=idx+1;const complete=n<step||(n===3&&done);const current=n===step&&!complete;return <li key={label} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-medium sm:text-sm ${current?'border-primary bg-primary/10 text-foreground':complete?'border-success/40 text-success':'border-border text-muted-foreground'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${current?'bg-primary text-primary-foreground':complete?'bg-success/20':'bg-muted'}`}>{complete?<Check className="h-3 w-3"/>:n}</span><span className="truncate">{label}</span></li>;})}</ol>;
 const [open,setOpen]=[detailsOpen,setDetailsOpen];
 const body=task?.recommendation&&<div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
  <div className="min-w-0 space-y-4">
   {removed&&added&&<div className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-3">
    <div className="w-16 shrink-0">{card(removed,t('coaching.remove'))}</div><ArrowRight className="h-5 w-5 shrink-0 text-primary"/><div className="w-16 shrink-0">{card(added,t('coaching.add'))}</div>
    <div className="min-w-0 flex-1 border-l border-border pl-4">{adviceLanguage && adviceLanguage !== i18n.resolvedLanguage && <p className="mb-2 text-sm font-medium">{facts}</p>}{savedLanguageLabel(adviceLanguage)}{reason&&<p lang={adviceLanguage} className="break-words text-sm leading-relaxed">{reason}</p>}{practice&&<p className="mt-2 text-sm"><span className="font-semibold text-primary">{t(done ? 'coaching.practiceTip' : 'coaching.practice')}: </span><span lang={adviceLanguage}>{practice}</span></p>}</div>
   </div>}
   <div className="rounded-lg border border-border p-3"><h3 className="mb-3 text-sm font-semibold">{t(done ? 'coaching.playedDeck' : 'coaching.ready')}</h3><div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{task.recommended_deck.map(c=>mini(c,c.id===added?.id))}</div><DeckTransfer cards={task.recommended_deck} playerTag={playerTag} /></div>
  </div>
  <div className="min-w-0 space-y-4">
   <div className={`rounded-lg border p-4 ${result?outcomeTone:'border-border'}`} aria-live="polite">{result?<>
     <h3 className="text-sm font-semibold">{t('coaching.result')}</h3>
     <div className="my-2 flex items-baseline gap-3"><strong className="font-rajdhani text-4xl">{result.score.join(' – ')}</strong><span className={`font-semibold ${outcomeText}`}>{t(`coaching.${result.outcome}`)}</span>{result.trophy_change!==null&&<span className="ml-auto text-sm text-muted-foreground">{t('coaching.trophies')}: <span className="font-semibold text-foreground">{result.trophy_change>0?'+':''}{result.trophy_change}</span></span>}</div>
     <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{t('coaching.next')}: </span>{t(result.outcome==='win'?'coaching.nextWin':result.outcome==='loss'?'coaching.nextLoss':'coaching.nextDraw')}</p>
     {result.opponent_deck.length>0&&<Collapsible className="mt-3"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="group -ml-2 h-8 px-2 text-xs"><ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"/>{t('coaching.showOpponent')}</Button></CollapsibleTrigger><CollapsibleContent><div className="mt-2 grid grid-cols-4 gap-2">{result.opponent_deck.map(c=>mini(c))}</div></CollapsibleContent></Collapsible>}
    </>:<>
     <p className="text-sm font-semibold">{t('coaching.waiting')}</p>
     <p className="mb-3 text-sm text-muted-foreground">{t('coaching.syncHint')}</p>
     <Button variant="outline" onClick={()=>void run('check')} disabled={!hasAccess||!!busy} className="h-auto min-h-11 w-full whitespace-normal py-2">{busy==='check'?<Loader2 className="animate-spin"/>:<RefreshCw/>}{t('coaching.check')}</Button>
    </>}
    <p className="mt-3 text-xs text-muted-foreground">{t('coaching.checked',{time:time(task.last_checked_at)})}{task.battles_fetched_at&&<> · {t('coaching.observed',{time:time(task.battles_fetched_at)})}</>}</p>
   </div>
   {!done && isTrialActive && <TrialFollowup userId={userId} playerTag={playerTag.replace(/^#/,'').toUpperCase()} />}
   <div className="rounded-lg border border-border p-4">{task.follow_up_answer?<><h3 className="mb-3 text-sm font-semibold">{t('coaching.saved')}</h3><p className="mb-3 break-words text-sm text-muted-foreground"><span className="font-semibold">{t('coaching.you')}: </span>{task.follow_up_question}</p><div className="rounded-md border-l-2 border-primary bg-primary/5 p-3"><p className="mb-1 text-xs font-semibold text-primary">{t('coaching.coach')}</p><div>{savedLanguageLabel(answerLanguage)}</div><p lang={answerLanguage} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{answer}</p></div></>:<form onSubmit={e=>{e.preventDefault();void run('follow-up');}}><label htmlFor="task-question" className="mb-2 block text-sm font-semibold">{t('coaching.followUp')}</label><Textarea id="task-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={500} placeholder={t('coaching.placeholder')} disabled={!hasAccess||!!busy}/><Button type="submit" variant="outline" disabled={!hasAccess||!!busy||!question.trim()} className="mt-3 h-auto min-h-11 w-full whitespace-normal py-2"><Send/>{t('coaching.ask')}</Button></form>}</div>
  </div>
 </div>;
 const summary=done&&removed&&added&&<div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><img src={removed.iconUrls?.medium} alt={cardLabel(removed.name)} className="h-10 w-auto"/><ArrowRight className="h-4 w-4 text-primary"/><img src={added.iconUrls?.medium} alt={cardLabel(added.name)} className="h-10 w-auto"/><span className="font-rajdhani text-2xl font-bold">{result!.score.join(' – ')}</span><span className={`font-semibold ${outcomeText}`}>{t(`coaching.${result!.outcome}`)}</span></div>;
 return <Card aria-label={t('coaching.intro')} className="mb-6 min-w-0 border-border/60 bg-card/80 p-4 pb-6 sm:p-6">
  {header}
  {(query.isLoading||accessLoading)?<p className="mt-4 text-sm text-muted-foreground">{t('coaching.loading')}</p>:task?.recommendation?<>
   {previous && <details className="mt-4 rounded-lg border border-border px-3">
     <summary className="cursor-pointer py-3 text-sm font-semibold focus-visible:outline-primary">
       {t('coaching.previousMatch')} · {previous.battle_result.score.join(' – ')} · {t(`coaching.${previous.battle_result.outcome}`)}
     </summary>
     <div className="space-y-3 pb-3 text-sm">
       {previous.battle_result.trophy_change !== null && <p>{t('coaching.trophies')}: {previous.battle_result.trophy_change > 0 ? '+' : ''}{previous.battle_result.trophy_change}</p>}
       <p className="font-semibold">{t('coaching.playedDeck')}</p>
       <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{previous.recommended_deck.map(c=>mini(c))}</div>
       {previous.battle_result.opponent_deck.length > 0 && <>
         <p className="font-semibold">{t('coaching.opponent')}</p>
         <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{previous.battle_result.opponent_deck.map(c=>mini(c))}</div>
       </>}
     </div>
   </details>}
   {stepper}
   {done?<>{!open&&summary}{open&&body}<Button variant="ghost" size="sm" className="mt-3 -ml-2 h-8 px-2 text-xs" onClick={()=>setOpen(!open)}><ChevronDown className={`h-4 w-4 transition-transform ${open?'rotate-180':''}`}/>{open?t('coaching.hideDetails'):t('coaching.showDetails')}</Button></>:body}
  </>:hasAccess&&confirmation?<div className="mt-4 space-y-3" aria-live="polite">
    <p className="text-sm">{t(confirmation.from_battle?'coaching.partialDeck':'coaching.changedDeck')}</p>
    <div className="grid max-w-lg grid-cols-4 gap-2 sm:grid-cols-8">{confirmation.cards.map(c=>mini(c))}</div>
    <div className="flex flex-wrap gap-2">
      <Button disabled={!!busy} onClick={()=>void run('start',confirmation.cards.map(c=>c.id))}>{busy?t('coaching.preparing'):t('coaching.confirmDeck')}</Button>
      <Button variant="outline" disabled={!!busy} onClick={()=>setConfirmation(null)}>{t('common.cancel')}</Button>
    </div>
  </div>:hasAccess&&!query.error?<Button onClick={()=>void run('start')} disabled={!!busy} className="mt-4 h-auto min-h-11 whitespace-normal py-2">{busy?<Loader2 className="animate-spin"/>:<Swords/>}{busy?t('coaching.preparing'):t('coaching.start')}</Button>:null}
  {!accessLoading&&!hasAccess&&<p className="mt-4 text-sm text-muted-foreground">{t('coaching.expired')}</p>}
  {(error||query.error)&&<div role="alert" className="mt-4 flex flex-wrap items-center gap-3"><p className="min-w-0 break-words text-sm text-destructive">{t(error || 'coaching.error')}</p>{(query.error || error === 'coaching.profileRefreshError') && <Button size="icon" variant="ghost" aria-label={t('common.retry')} onClick={()=>{ if(task?.battle_result && error === 'coaching.profileRefreshError') void run('check'); else void query.refetch(); }}><RefreshCw/></Button>}</div>}
 </Card>;
}
