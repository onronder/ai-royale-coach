import { useState } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { consentStateKey, emailWinback, inAppWinback, type WinbackCandidateLite } from '@/lib/winbackAudience';

type MarketingRow = { user_id: string; subscription_id: string; trial_start: string; at_start: string; current: string; sendable: boolean; reason: string | null };
type MarketingReport = { sendingEnabled: boolean; approvedMarkets: string[]; requireIys: boolean; rows: MarketingRow[];
  collectionOpen: boolean; collectionMarkets: string[]; ageRuleApproved: boolean;
  accounts: number; granted: number; pending: number; sendable: number; iysPending: number };

type Row = Database['public']['Functions']['admin_trial_conversion']['Returns'][number];
type CancelAnswer = { reason: string; total: number };
type Revenue = {
  unclassified_subscriptions: number; unknown_paid_time: number; eligible_paid: number; eligible_trials: number; positive_orders: number; zero_orders: number;
  paid_by_currency: { currency: string | null; cents: number }[]; pending_orders: number;
  quota_denials: number; quota_denied_users: number; denied_then_cancelled: number; renewal_off_while_trialing: number;
};

function cancelHours(row: Row) {
  return row.canceled_at ? (Date.parse(row.canceled_at) - Date.parse(row.trial_start)) / 3_600_000 : null;
}

export function TrialAnalyticsPanel() {
  const { t, i18n } = useTranslation();
  const fmt = (date: string | null) => date ? new Date(date).toLocaleString(i18n.language) : '—';
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState<string>('all');
  const answers = useQuery({
    queryKey: ['trial-cancel-answers', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('trial_cancel_answers' as never, { p_days: days } as never);
      if (error) throw error;
      return (data ?? []) as unknown as CancelAnswer[];
    },
  });
  const { data = [], isLoading, error, refetch: refetchCohort } = useQuery({
    queryKey: ['trial-conversion', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_trial_conversion', { p_days: days });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rev, refetch: refetchRev } = useQuery({
    queryKey: ['trial-revenue', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trial_revenue_metrics', { p_days: days });
      if (error) throw error;
      return data as unknown as Revenue;
    },
  });
  const [syncing, setSyncing] = useState(false);
  const syncOrders = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('backfill-polar-orders');
      if (error) throw error;
      await Promise.all([refetchRev(), refetchCohort()]);
    } finally {
      setSyncing(false);
    }
  };

  const marketing = useQuery({
    queryKey: ['trial-marketing', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_trial_marketing' as never, { p_days: days } as never);
      if (error) throw error;
      return data as unknown as MarketingReport;
    },
  });
  const candidates = useQuery({
    queryKey: ['winback-eligible-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_winback_candidates');
      if (error) throw error;
      return ((data ?? []) as unknown as (WinbackCandidateLite & { activity_score: number })[]).sort((a, b) => b.activity_score - a.activity_score);
    },
    staleTime: 30 * 1000,
  });
  const consentFor = (r: Row) => marketing.data?.rows.find(m => m.user_id === r.user_id && m.subscription_id === r.subscription_id);

  const total = data.length;
  const steps = [
    { label: t('admin.trials.startedTrial'), n: total },
    { label: t('admin.trials.linkedTag'), n: data.filter(r => r.linked_tags > 0).length },
    { label: t('conversion.cardSeen'), n: data.filter(r => r.card_seen).length },
    { label: t('conversion.requested'), n: data.filter(r => r.requested).length },
    { label: t('conversion.recommendationSeen'), n: data.filter(r => r.recommendation_seen).length },
    { label: t('conversion.match'), n: data.filter(r => r.matched).length },
    { label: t('admin.trials.firstAnalysis'), n: data.filter(r => r.ai_uses > 0).length },
    { label: t('admin.trials.returned'), n: data.filter(r => r.active_days >= 2).length },
    { label: t('admin.trials.converted'), n: data.filter(r => r.has_payment).length },
  ];
  const accounts = new Set(data.map(row => row.user_id)).size;
  const coachSteps = [
    { label: t('conversion.cardSeen'), n: data.filter(r => r.card_seen).length },
    { label: t('conversion.requested'), n: data.filter(r => r.requested).length },
    { label: t('conversion.match'), n: data.filter(r => r.matched).length },
  ];
  const filters = [
    { key: 'all', label: t('conversion.overview.all'), match: () => true },
    { key: 'trialing', label: t('conversion.overview.trialing'), match: (r: Row) => r.segment === 'trial_renewal_on' || r.segment === 'trial_renewal_off' },
    { key: 'trial_renewal_off', label: t('conversion.trial_renewal_off'), match: (r: Row) => r.segment === 'trial_renewal_off' },
    { key: 'payment_recovery', label: t('conversion.payment_recovery'), match: (r: Row) => r.segment === 'payment_recovery' },
    { key: 'expired_winback', label: t('conversion.expired_winback'), match: (r: Row) => r.segment === 'expired_winback' },
  ];
  const activeFilter = filters.find(f => f.key === filter) ?? filters[0];
  const visible = data.filter(activeFilter.match);
  const inAppRows = inAppWinback(data);
  const emailRows = candidates.data ? emailWinback(inAppRows, candidates.data) : [];
  const canceled = data.filter(r => r.canceled_at !== null);
  const within1h = canceled.filter(r => (cancelHours(r) ?? 99) <= 1).length;
  const avgCancel = canceled.length ? canceled.reduce((a, r) => a + (cancelHours(r) ?? 0), 0) / canceled.length : null;
  const reasons = data.reduce<Record<string, number>>((acc, r) => { const k = 'conversion.' + r.segment; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <Button key={d} size="sm" variant={d === days ? 'default' : 'outline'} onClick={() => setDays(d)}>{t('admin.trials.daysRange', { days: d })}</Button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : error ? (
        <Card role="alert" className="border-destructive/50">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium">{t('conversion.overview.loadError')}</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
            <Button variant="outline" onClick={() => void refetchCohort()}>{t('conversion.overview.retry')}</Button>
          </CardContent>
        </Card>
      ) : total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">{t('conversion.overview.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('conversion.overview.emptyBody')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{t('conversion.overview.trialsStarted')}</p>
                <p className="mt-1 text-3xl font-bold">{total}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('conversion.overview.accounts', { trials: total, accounts })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{t('conversion.overview.d7Paid')}</p>
                <p className="mt-1 text-3xl font-bold">
                  {!rev ? '–' : rev.eligible_trials ? <>{rev.eligible_paid}<span className="text-lg text-muted-foreground"> / {rev.eligible_trials}</span></> : '—'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rev && rev.eligible_trials ? `${Math.round((rev.eligible_paid / rev.eligible_trials) * 100)}% · ${t('conversion.overview.d7Sub')}` : t('conversion.overview.d7Wait')}
                </p>
              </CardContent>
            </Card>
            <Card className={rev?.unknown_paid_time ? 'border-primary/40' : undefined}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{t('conversion.overview.unknownTime')}</p>
                <p className="mt-1 text-3xl font-bold">{rev?.unknown_paid_time ?? '–'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('conversion.overview.unknownSub')}</p>
              </CardContent>
            </Card>
          </div>
          {rev && rev.unclassified_subscriptions > 0 && <p className="text-sm text-muted-foreground">{t('conversion.unclassified', { count: rev.unclassified_subscriptions })}</p>}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('conversion.overview.coachSteps')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('conversion.overview.coachNote')}</p>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 sm:grid-cols-3">
                {coachSteps.map((s, i) => (
                  <li key={s.label} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">{i + 1}</span>{s.label}
                    </div>
                    <div className="mt-1 text-2xl font-bold">{s.n} <span className="text-sm font-normal text-muted-foreground">{Math.round((s.n / total) * 100)}%</span></div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { id: 'inapp', title: t('conversion.overview.inApp'), note: t('conversion.overview.inAppNote'), rows: inAppRows, state: 'ok' as const, retry: undefined },
              { id: 'email', title: t('conversion.overview.email'), note: t('conversion.overview.emailNote'), rows: emailRows,
                state: candidates.isError ? 'error' as const : candidates.data ? 'ok' as const : 'loading' as const, retry: () => void candidates.refetch() },
            ].map(g => (
              <Card key={g.id} data-testid={`winback-${g.id}`} className="min-w-0">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="min-w-0 text-base">{g.title}</CardTitle>
                    {g.state === 'ok' ? <Badge variant="secondary" className="shrink-0">{t('conversion.overview.listCount', { count: g.rows.length })}</Badge>
                      : g.state === 'loading' ? <Skeleton className="h-5 w-16 rounded-full" aria-label={t('common.loading')} /> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{g.note}</p>
                </CardHeader>
                <CardContent>
                  {g.state === 'loading' ? <div className="space-y-2" aria-busy="true"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
                    : g.state === 'error' ? (
                      <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="flex-1">{t('conversion.overview.emailLoadError')}</span>
                        <Button size="sm" variant="outline" onClick={g.retry}>{t('conversion.overview.retry')}</Button>
                      </div>
                    ) : g.rows.length ? (
                    <ul className="max-h-48 divide-y overflow-y-auto rounded-md border text-sm">
                      {g.rows.map(r => <li key={r.user_id ?? r.subscription_id ?? undefined} className="truncate px-3 py-2" title={r.email ?? undefined}>{r.email ?? '—'}</li>)}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">{t('conversion.overview.none')}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>{t('admin.trials.funnel')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('conversion.scope', { trials: total, accounts })}</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {steps.map(s => (
                <div key={s.label} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-bold">{s.n}</div>
                  <div className="text-xs text-muted-foreground">{total ? Math.round((s.n / total) * 100) : 0}%</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{t('admin.trials.revenue')}</CardTitle>
              <Button size="sm" variant="outline" onClick={syncOrders} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.trials.sync')}
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t('admin.trials.rate'), v: rev ? (rev.eligible_trials ? `${rev.eligible_paid}/${rev.eligible_trials}` : '—') : '–',
                  sub: rev?.unknown_paid_time ? t('conversion.unknownPayments', { count: rev.unknown_paid_time }) : rev && rev.eligible_trials ? `${Math.round((rev.eligible_paid / rev.eligible_trials) * 100)}%` : rev ? t('conversion.waitD7') : '' },
                { label: t('admin.trials.positive'), v: rev?.positive_orders ?? '–', sub: rev?.paid_by_currency?.map(c => c.currency && /^[A-Z]{3}$/.test(c.currency) ? new Intl.NumberFormat(i18n.language, { style: 'currency', currency: c.currency }).format(c.cents / 100) : '—').join(' · ') ?? '' },
                { label: t('conversion.pendingOrders'), v: rev?.pending_orders ?? '–', sub: '' },
                { label: t('admin.trials.zero'), v: rev?.zero_orders ?? '–', sub: '' },
                { label: t('admin.trials.quota'), v: rev?.quota_denials ?? '–', sub: rev ? t('admin.trials.quotaUsers', { users: rev.quota_denied_users, canceled: rev.denied_then_cancelled }) : '' },
                { label: t('admin.trials.renewalOff'), v: rev?.renewal_off_while_trialing ?? '–', sub: '' },
              ].map(c => (
                <div key={c.label} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="text-2xl font-bold">{c.v}</div>
                  <div className="text-xs text-muted-foreground">{c.sub}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>{t('admin.trials.timing')}</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>{t('admin.trials.during')}: <b>{canceled.length}</b> / {total}</div>
                <div>{t('admin.trials.withinHour')}: <b>{within1h}</b></div>
                <div>{t('admin.trials.hoursToCancel')}: <b>{avgCancel === null ? '—' : avgCancel.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}</b></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('admin.trials.observed')}</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(reasons).map(([k, v]) => <Badge key={k} variant="secondary">{t(k)}: {v}</Badge>)}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>{t('trialFollowup.admin')}</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {answers.isError ? <Button variant="outline" onClick={() => void answers.refetch()}>{t('common.retry')}</Button>
                : answers.isLoading ? <Loader2 className="h-4 w-4 animate-spin" />
                : answers.data?.length ? answers.data.map(row => <Badge key={row.reason} variant="secondary">{t('trialFollowup.' + row.reason)} · {row.total}</Badge>)
                : <p className="text-sm text-muted-foreground">{t('trialFollowup.empty')}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('marketing.admin.title')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {marketing.isError ? <Button variant="outline" onClick={() => void marketing.refetch()}>{t('marketing.retry')}</Button>
                : !marketing.data ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <div className="text-xs text-muted-foreground">{t('marketing.admin.collectionRule')}</div>
                    <div className="font-medium">{marketing.data.collectionOpen ? t('marketing.admin.collectionOn') : t('marketing.admin.collectionOff')}</div>
                    <div className="text-xs text-muted-foreground">{t('marketing.admin.marketRule')}: {marketing.data.collectionMarkets.length ? t('marketing.admin.approved') : t('marketing.admin.pending')} · {t('marketing.admin.ageRule')}: {marketing.data.ageRuleApproved ? t('marketing.admin.approved') : t('marketing.admin.pending')}</div>
                  </div>
                  <div role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <div className="text-xs text-muted-foreground">{t('marketing.admin.sendingRule')}</div>
                    <div className="font-medium">{marketing.data.sendingEnabled ? t('marketing.admin.sendingOn') : t('marketing.admin.sendingOff')}</div>
                    <div className="text-xs text-muted-foreground">{t('marketing.admin.sendingRuleNote')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t('marketing.admin.accounts'), v: marketing.data.accounts },
                    { label: t('marketing.admin.granted'), v: marketing.data.granted },
                    { label: t('marketing.admin.sendableToday'), v: marketing.data.sendable },
                    { label: t('marketing.admin.iysPending'), v: marketing.data.iysPending },
                  ].map(c => <div key={c.label} className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{c.label}</div><div className="text-2xl font-bold">{c.v}</div></div>)}
                </div>
                <p className="text-xs text-muted-foreground">{t('marketing.admin.note')}</p>
                {data.length > 0 && <ul className="divide-y rounded-lg border" aria-label={t('marketing.admin.perPlayer')}>
                  {data.map(r => { const m = consentFor(r); return (
                    <li key={r.subscription_id} className="p-3">
                      <div className="truncate text-sm font-medium">{r.email ?? '—'}</div>
                      <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div><dt className="text-xs text-muted-foreground">{t('marketing.admin.atStart')}</dt><dd>{t(consentStateKey(m?.at_start))}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">{t('marketing.admin.today')}</dt><dd>{m ? t(consentStateKey(m.current)) : '—'}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">{t('marketing.admin.sendableToday')}</dt><dd>{m ? (m.sendable ? t('marketing.admin.yes') : <>{t('marketing.admin.no')} <span className="text-muted-foreground">({t('marketing.reason.' + (m.reason ?? 'unknown'))})</span></>) : '—'}</dd></div>
                      </dl>
                    </li>); })}
                </ul>}
              </>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-3"><CardTitle>{t('admin.trials.users')}</CardTitle>
              <div role="group" aria-label={t('conversion.overview.filters')} className="flex flex-wrap gap-2">
                {filters.map(f => (
                  <Button key={f.key} size="sm" variant={f.key === activeFilter.key ? 'default' : 'outline'} aria-pressed={f.key === activeFilter.key} onClick={() => setFilter(f.key)}>
                    {f.label} <span className="ml-1 opacity-70">{data.filter(f.match).length}</span>
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('conversion.overview.none')}</p>}
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>{['auth.email', 'admin.fraudCases.columns.status', 'admin.trials.started', 'admin.trials.ends', 'admin.trials.canceled', 'admin.trials.hours', 'admin.trials.tags', 'commonExtra.ai', 'admin.trials.chat', 'admin.trials.days', 'admin.trials.lastSeen', 'admin.trials.activity', 'conversion.firstPaid', 'conversion.afterCancel', 'conversion.returnedAfterEnd'].map(h => <th key={h} className="p-2 whitespace-nowrap">{t(h)}</th>)}</tr>
                </thead>
                <tbody>
                  {visible.map(r => (
                    <tr key={r.subscription_id} className="border-t">
                      <td className="p-2">{r.email}</td>
                      <td className="p-2"><Badge variant="outline">{r.status === 'superseded' ? t('conversion.superseded') : t('admin.trials.status.' + r.status, { defaultValue: r.status })}</Badge></td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.trial_start)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.trial_end)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.canceled_at)}</td>
                      <td className="p-2">{cancelHours(r)?.toLocaleString(i18n.language, { maximumFractionDigits: 1 }) ?? '—'}</td>
                      <td className="p-2">{r.linked_tags}</td>
                      <td className="p-2">{r.ai_uses}</td>
                      <td className="p-2">{r.chat_messages}</td>
                      <td className="p-2">{r.active_days}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.last_seen)}</td>
                      <td className="p-2 whitespace-nowrap">{t('conversion.' + r.segment)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.first_paid_at)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.last_action_after_cancel)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.first_return_after_end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
