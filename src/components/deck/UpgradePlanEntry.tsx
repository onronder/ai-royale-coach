import { lazy, Suspense, useContext, useEffect, useId, useReducer, useRef, useState } from 'react';
import { ChevronRight, Layers, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SubscriptionUserContext, useSubscription } from '@/hooks/useSubscription';
import type { ClashRoyalePlayer } from '@/services/clashRoyaleApi';
import { canonicalTag } from '../../../supabase/functions/_shared/battle-observation';
import { subscriptionAccess } from '../../../supabase/functions/_shared/subscription-access';

const UpgradePlan = lazy(() => import('./UpgradePlan'));

export function UpgradePlanEntry({ playerTag, player }: { playerTag: string; player: ClashRoyalePlayer }) {
  const account = useContext(SubscriptionUserContext);
  const { hasAccess, isTrialActive, status } = useSubscription();
  const subscription = status?.subscription;
  const paid = subscriptionAccess(subscription && {
    status: subscription.status, ends_at: subscription.endsAt, current_period_end: subscription.currentPeriodEnd,
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
  }) === 'paid';
  const trialEnd = isTrialActive ? Date.parse(status?.trial?.endsAt ?? '') : NaN;
  const paidEnd = paid && subscription?.cancelAtPeriodEnd
    ? Date.parse(subscription.endsAt || subscription.currentPeriodEnd || '') : NaN;
  const trial = trialEnd > Date.now();
  const deadline = paid ? paidEnd : trialEnd;
  const [, recheckAccess] = useReducer(n => n + 1, 0);
  useEffect(() => {
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      const remaining = deadline - Date.now();
      if (remaining <= 0) recheckAccess();
      else timer = setTimeout(schedule, Math.min(remaining, 2147483647));
    }
    schedule();
    return () => clearTimeout(timer);
  }, [deadline]);
  const tag = canonicalTag(playerTag);
  if (!account || !hasAccess || (!trial && !paid) || canonicalTag(player.tag) !== tag || !player.currentDeck?.length) return null;
  return <PlanDisclosure key={account + tag} account={account} tag={tag} cards={player.currentDeck} />;
}

function PlanDisclosure({ account, tag, cards }: { account: string; tag: string; cards: NonNullable<ClashRoyalePlayer['currentDeck']> }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const resume = location.state?.openUpgradePlan;
  const [open, setOpen] = useState(resume?.account === account && resume?.tag === tag);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);
  function close() {
    setOpen(false);
    if (resume) {
      const state = { ...location.state, openUpgradePlan: null };
      navigate(location.pathname + location.search + location.hash, { replace: true, state, preventScrollReset: true });
    }
  }
  return <>
    <Button variant="outline" className="mb-3 min-h-11 gap-2" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Layers aria-hidden="true" size={17} />{t('upgradePlan.title')}<ChevronRight aria-hidden="true" size={16} />
    </Button>
    {open && <dialog ref={dialog} onClose={close} aria-labelledby={titleId}
      className="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-none overflow-hidden bg-background p-0 text-foreground backdrop:bg-black/70 open:flex open:flex-col sm:h-auto sm:max-h-[88dvh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-border">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] sm:px-6">
        <h2 id={titleId} className="text-xl font-bold">{t('upgradePlan.title')}</h2>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t('common.close')} onClick={() => dialog.current?.close()}>
          <X aria-hidden="true" size={20} />
        </Button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <Suspense fallback={<p role="status">{t('common.loading')}</p>}>
          <UpgradePlan account={account} tag={tag} cards={cards} />
        </Suspense>
      </div>
    </dialog>}
  </>;
}
