import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMarketingConsent, markMarketingPrompt, newRequestKey, setMarketingConsent, type MarketingState } from '@/lib/marketingConsent';

/**
 * Optional, dismissible campaign-email invite on the Coach screen. Shown once per account (not per device or tag), and a
 * "confirm" card for a sign-up choice that is still waiting for the player's own confirmation. Errors never block coaching.
 */
export function MarketingInvite({ userId }: { userId: string }) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const key = ['marketing-consent', userId];
  const consent = useQuery({ queryKey: key, queryFn: getMarketingConsent, retry: 1, staleTime: 60_000 });
  const [requestKey, setRequestKey] = useState(newRequestKey);
  const [hidden, setHidden] = useState(false);
  const marked = useRef(false);
  const data = consent.data;
  const mode: 'invite' | 'confirm' | null = !data || hidden || !data.collectionOpen ? null : data.state === 'pending' && data.verified ? 'confirm' : data.invite ? 'invite' : null;

  useEffect(() => {
    if (mode === 'invite' && !marked.current) { marked.current = true; markMarketingPrompt('shown').catch(() => {}); }
  }, [mode]);

  const grant = useMutation({
    mutationFn: (expected: MarketingState) => setMarketingConsent('grant', mode === 'confirm' ? 'signup_confirm' : 'coach_invite', expected, i18n.language, requestKey),
    onSuccess: r => { if (r.status !== 'ok') client.invalidateQueries({ queryKey: key }); else client.setQueryData(key, { ...data!, state: r.state, invite: false }); setRequestKey(newRequestKey()); },
  });
  const dismiss = useMutation({
    mutationFn: () => markMarketingPrompt('dismissed'),
    onSuccess: () => { setHidden(true); client.invalidateQueries({ queryKey: key }); },
  });

  if (grant.data?.status === 'ok' && grant.data.state === 'granted') {
    return <p role="status" className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t('marketing.savedOn')}</p>;
  }
  if (!mode) return null;
  return (
    <section aria-labelledby="marketing-invite-title" className="relative mt-4 w-full rounded-xl border border-border bg-card p-4 sm:p-5">
      {mode === 'invite' && (
        <button type="button" onClick={() => dismiss.mutate()} disabled={dismiss.isPending} aria-label={t('marketing.notNow')}
          className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start gap-3 pr-10">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <h2 id="marketing-invite-title" className="font-semibold">{mode === 'confirm' ? t('marketing.confirmTitle') : t('marketing.inviteTitle')}</h2>
          {mode === 'confirm' && <p className="text-sm text-muted-foreground">{t('marketing.confirmBody')}</p>}
          <p className="text-sm text-muted-foreground">{t('marketing.text')}</p>
          <p className="text-xs text-muted-foreground">{t('marketing.inviteNote')}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => grant.mutate(data!.state)} disabled={grant.isPending} className="w-full sm:w-auto">{t('marketing.optInShort')}</Button>
        {mode === 'invite'
          ? <Button variant="outline" onClick={() => dismiss.mutate()} disabled={dismiss.isPending} className="w-full sm:w-auto">{t('marketing.notNow')}</Button>
          : <Button variant="outline" asChild className="w-full sm:w-auto"><Link to="/settings/email">{t('marketing.manage')}</Link></Button>}
      </div>
      {(grant.isError || dismiss.isError || (grant.data && grant.data.status !== 'ok')) && (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <span>{grant.data?.status === 'conflict' ? t('marketing.conflict') : grant.data?.status === 'collection_paused' ? t('marketing.collectionPaused') : t('marketing.saveError')}</span>
          <Button size="sm" variant="outline" onClick={() => grant.isError ? grant.mutate(data!.state) : dismiss.isError ? dismiss.mutate() : consent.refetch()}>{t('marketing.retry')}</Button>
        </div>
      )}
    </section>
  );
}
