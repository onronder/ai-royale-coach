import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type Row = {
  user_id: string; email: string | null; status: string; trial_start: string; trial_end: string | null;
  canceled_at: string | null; hours_to_cancel: number | null; linked_tags: number; ai_uses: number;
  chat_messages: number; active_days: number; last_seen: string | null; converted: boolean;
};

type CancelAnswer = { reason: string; total: number };

function reason(r: Row): string {
  if (r.converted) return 'admin.trials.paid';
  if (r.hours_to_cancel !== null && r.hours_to_cancel <= 1) return 'admin.trials.canceledImmediately';
  if (r.ai_uses === 0 && r.chat_messages === 0) return 'admin.trials.neverUsed';
  if (r.ai_uses <= 1 && r.canceled_at) return 'admin.trials.onceCanceled';
  if (r.status === 'trialing') return 'admin.trials.inTrial';
  return 'admin.trials.noPayment';
}

export function TrialAnalyticsPanel() {
  const { t, i18n } = useTranslation();
  const fmt = (date: string | null) => date ? new Date(date).toLocaleString(i18n.language) : '—';
  const [days, setDays] = useState(30);
  const answers = useQuery({
    queryKey: ['trial-cancel-answers', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('trial_cancel_answers' as never, { p_days: days } as never);
      if (error) throw error;
      return (data ?? []) as unknown as CancelAnswer[];
    },
  });
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['trial-funnel', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trial_funnel' as never, { p_days: days } as never);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const { data: rev, refetch: refetchRev } = useQuery({
    queryKey: ['trial-revenue', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trial_revenue_metrics', { p_days: days });
      if (error) throw error;
      return data as Record<string, number>;
    },
  });
  const [syncing, setSyncing] = useState(false);
  const syncOrders = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('backfill-polar-orders');
      if (error) throw error;
      await refetchRev();
    } finally {
      setSyncing(false);
    }
  };

  const total = data.length;
  const steps = [
    { label: t('admin.trials.startedTrial'), n: total },
    { label: t('admin.trials.linkedTag'), n: data.filter(r => r.linked_tags > 0).length },
    { label: t('admin.trials.firstAnalysis'), n: data.filter(r => r.ai_uses > 0).length },
    { label: t('admin.trials.returned'), n: data.filter(r => r.active_days >= 2).length },
    { label: t('admin.trials.converted'), n: data.filter(r => r.converted).length },
  ];
  const canceled = data.filter(r => r.hours_to_cancel !== null);
  const within1h = canceled.filter(r => (r.hours_to_cancel ?? 99) <= 1).length;
  const avgCancel = canceled.length ? canceled.reduce((a, r) => a + Number(r.hours_to_cancel), 0) / canceled.length : null;
  const reasons = data.reduce<Record<string, number>>((acc, r) => { const k = reason(r); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <Button key={d} size="sm" variant={d === days ? 'default' : 'outline'} onClick={() => setDays(d)}>{t('admin.trials.daysRange', { days: d })}</Button>
        ))}
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : error ? (
        <p className="text-destructive">{(error as Error).message}</p>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>{t('admin.trials.funnel')}</CardTitle></CardHeader>
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
                { label: t('admin.trials.rate'), v: rev ? `${rev.eligible_paid}/${rev.eligible_trials}` : '–',
                  sub: rev && rev.eligible_trials ? `${Math.round((rev.eligible_paid / rev.eligible_trials) * 100)}%` : '' },
                { label: t('admin.trials.positive'), v: rev?.positive_orders ?? '–', sub: rev ? new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD' }).format(rev.positive_amount_cents / 100) : '' },
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
            <CardHeader><CardTitle>{t('admin.trials.users')}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>{['auth.email', 'admin.fraudCases.columns.status', 'admin.trials.started', 'admin.trials.ends', 'admin.trials.canceled', 'admin.trials.hours', 'admin.trials.tags', 'commonExtra.ai', 'admin.trials.chat', 'admin.trials.days', 'admin.trials.lastSeen', 'admin.trials.activity'].map(h => <th key={h} className="p-2 whitespace-nowrap">{t(h)}</th>)}</tr>
                </thead>
                <tbody>
                  {data.map(r => (
                    <tr key={r.user_id + r.trial_start} className="border-t">
                      <td className="p-2">{r.email}</td>
                      <td className="p-2"><Badge variant="outline">{t('admin.trials.status.' + r.status, { defaultValue: r.status })}</Badge></td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.trial_start)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.trial_end)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.canceled_at)}</td>
                      <td className="p-2">{r.hours_to_cancel ?? '—'}</td>
                      <td className="p-2">{r.linked_tags}</td>
                      <td className="p-2">{r.ai_uses}</td>
                      <td className="p-2">{r.chat_messages}</td>
                      <td className="p-2">{r.active_days}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.last_seen)}</td>
                      <td className="p-2 whitespace-nowrap">{t(reason(r))}</td>
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
