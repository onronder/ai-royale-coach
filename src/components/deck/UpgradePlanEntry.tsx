import { lazy, Suspense, useContext, useId, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const tag = canonicalTag(playerTag);
  if (!account || !hasAccess || (!isTrialActive && !paid) || canonicalTag(player.tag) !== tag || !player.currentDeck?.length) return null;
  return <PlanDisclosure key={account + tag} account={account} tag={tag} cards={player.currentDeck} />;
}

function PlanDisclosure({ account, tag, cards }: { account: string; tag: string; cards: NonNullable<ClashRoyalePlayer['currentDeck']> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="mt-4 border-t border-border pt-4">
    <Button variant="outline" className="min-h-11" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <Layers aria-hidden="true" className="mr-2 h-4 w-4" />{t('upgradePlan.title')}
      <ChevronDown aria-hidden="true" className={'ml-2 h-4 w-4 ' + (open ? 'rotate-180' : '')} />
    </Button>
    <div id={id} hidden={!open}>{open && <Suspense fallback={<p role="status">{t('common.loading')}</p>}>
      <UpgradePlan account={account} tag={tag} cards={cards} />
    </Suspense>}</div>
  </div>;
}
