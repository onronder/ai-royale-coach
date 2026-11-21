import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { practiceVisit } from '@/lib/practiceVisit';
import { firstPracticeSentence, type practiceGoal } from '../../../supabase/functions/_shared/practice-repeat';
import { DeckTransfer } from './DeckTransfer';
import type { Task } from './FirstSessionTask';

export interface PracticeRequest {
  taskId: string;
  firstKey: string;
  visitId?: string;
  automatic?: boolean;
}
export type PracticeAction = 'repeat-view' | 'repeat-accept' | 'repeat-check';

export function PracticeRepeat({ task, account, tag, allowed, busy, action, view, localizedTip, goal }: {
  goal: ReturnType<typeof practiceGoal>;
  task: Task;
  account: string;
  tag: string;
  allowed: boolean;
  busy: boolean;
  localizedTip?: string;
  action: (action: PracticeAction, request: PracticeRequest) => void;
  view: (request: PracticeRequest) => Promise<unknown>;
}) {
  const { t, i18n } = useTranslation();
  const section = useRef<HTMLElement>(null);
  const offerButton = useRef<HTMLButtonElement>(null);
  const lastView = useRef('');
  const repeat = task.practice_repeat;
  const firstKey = repeat?.first.key ?? task.matched_battle_key;
  const visible = !!repeat || !!(allowed && goal && firstKey);
  const onView = useRef(view);
  onView.current = view;
  useEffect(() => {
    const root = repeat ? section.current : offerButton.current;
    if (!root || !visible || !firstKey || repeat?.returned_at || (!repeat && task.practice_seen_at)) return;
    let active = true, intersects = false;
    const observe = async () => {
      if (!active || !intersects || document.visibilityState !== 'visible') return;
      const id = await practiceVisit(account);
      if (!active || !intersects || document.visibilityState !== 'visible') return;
      if (repeat && (!id || !repeat.session || id === repeat.session)) return;
      const identity = [account, task.id, firstKey, id].join('/');
      if (lastView.current === identity) return;
      lastView.current = identity;
      try {
        await onView.current({ taskId: task.id, firstKey, visitId: id ?? undefined });
      } catch {
        if (lastView.current === identity) lastView.current = '';
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting && (!!repeat || entry.intersectionRatio >= 0.5);
      void observe();
    }, { threshold: repeat ? 0 : 0.5 });
    observer.observe(root);
    document.addEventListener('visibilitychange', observe);
    window.addEventListener('coaching-visit-changed', observe);
    window.addEventListener('focus', observe);
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener('visibilitychange', observe);
      window.removeEventListener('coaching-visit-changed', observe);
      window.removeEventListener('focus', observe);
    };
  }, [
    visible,
    account,
    task.id,
    firstKey,
    repeat?.session,
    repeat?.returned_at,
    task.practice_seen_at,
    !!repeat,
  ]);
  const onAction = useRef(action);
  onAction.current = action;
  useEffect(() => {
    const root = section.current;
    if (!root || !allowed || !firstKey || repeat?.status !== 'pending') return;
    let checked = false, visible = false;
    const onReturn = () => {
      if (document.visibilityState !== 'visible') {
        checked = false;
        return;
      }
      if (!visible || checked || Date.now() - Date.parse(repeat.accepted_at) < 30000) return;
      checked = true;
      onAction.current('repeat-check', { taskId: task.id, firstKey, automatic: true });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      onReturn();
    });
    observer.observe(root);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [task.id, firstKey, repeat?.status, repeat?.accepted_at, allowed]);
  if (!visible || !firstKey) return null;
  const click = async (name: PracticeAction) =>
    action(name, { taskId: task.id, firstKey, visitId: await practiceVisit(account) ?? undefined });
  const tip = repeat?.tip ?? goal?.tip;
  const translated = localizedTip && goal?.tip === tip && task.matched_battle_key === firstKey
    ? firstPracticeSentence(localizedTip)
    : null;
  const first = repeat?.first ?? task.battle_result!;
  return (
    <section
      ref={section}
      className='mt-4 space-y-3 rounded-lg border p-3'
      aria-label={t('practiceRepeat.title')}
    >
      <div className='flex flex-wrap gap-6' aria-live='polite'>
        {[first, repeat?.second].map((match, i) =>
          match && (
            <div key={i}>
              <p className='text-xs text-muted-foreground'>
                {t(i ? 'practiceRepeat.second' : 'practiceRepeat.first')}
              </p>
              <strong className='text-xl'>{match.score.join(' – ')}</strong> ·{' '}
              {t('coaching.' + match.outcome)}
            </div>
          )
        )}
      </div>
      <p lang={translated ? i18n.resolvedLanguage : repeat?.language ?? goal?.language}>
        {translated || tip}
      </p>
      {!repeat && (
        <Button
          ref={offerButton}
          disabled={busy}
          className='min-h-11 h-auto whitespace-normal'
          onClick={() => void click('repeat-accept')}
        >
          {t('practiceRepeat.accept')}
        </Button>
      )}
      {repeat?.status === 'pending' && (
        <>
          <p>{t('practiceRepeat.pending')}</p>
          {allowed && (
            <>
              <DeckTransfer cards={task.recommended_deck} playerTag={tag} />
              <Button variant='outline' disabled={busy} onClick={() => void click('repeat-check')}>
                {t('coaching.check')}
              </Button>
            </>
          )}
        </>
      )}
      {repeat?.status === 'completed' && (
        <p className='text-sm text-muted-foreground'>{t('practiceRepeat.compare')}</p>
      )}
      {repeat?.status === 'deck_changed' && <p role='status'>{t('practiceRepeat.changed')}</p>}
    </section>
  );
}
