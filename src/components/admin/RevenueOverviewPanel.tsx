import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRevenueDetail, useRevenueOverview, type RevenueFilter } from '@/hooks/useRevenueReports';
import { FUNNEL_STEPS, biggestLoss, formatCents, formatRate, istanbulDate, rate, shiftDate } from '@/lib/revenueFunnel';
import { PolarMrrCard } from './PolarMrrCard';
import { ReportError, ReportLoading } from './ReportState';

type Section = 'overview' | 'trials' | 'revenue';
const RANGES = ['7', '30', '90', 'all'] as const;

function useFilter() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('30');
  const [includeTests, setIncludeTests] = useState(false);
  const today = istanbulDate();
  const filter: RevenueFilter = { from: range === 'all' ? null : shiftDate(today, -Number(range) + 1), to: range === 'all' ? null : today, includeTests };
  return { range, setRange, includeTests, setIncludeTests, filter };
}

function Kpi({ label, value, hint, onOpen }: { label: string; value: string; hint?: string; onOpen?: () => void }) {
  const body = <>
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-2xl font-semibold tabular-nums">{value}</span>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </>;
  return onOpen
    ? <button type="button" onClick={onOpen} className="flex flex-col gap-1 rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</button>
    : <div className="flex flex-col gap-1 rounded-md border bg-card p-3">{body}</div>;
}

export function RevenueOverviewPanel({ section = 'overview', adminId }: { section?: Section; adminId?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { range, setRange, includeTests, setIncludeTests, filter } = useFilter();
  const q = useRevenueOverview(filter);
  const [detail, setDetail] = useState<{ metric: string; asOf: string } | null>(null);
  const n = (v: number | undefined) => new Intl.NumberFormat(lang).format(v ?? 0);
  const label = (k: string) => t(`admin.revenue.metric.${k}`);

  const filters = (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={range} onValueChange={v => setRange(v as typeof range)}>
        <SelectTrigger className="w-44" aria-label={t('admin.revenue.range')}><SelectValue /></SelectTrigger>
        <SelectContent>{RANGES.map(r => <SelectItem key={r} value={r}>{t(`admin.revenue.ranges.${r}`)}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Switch id={`tests-${section}`} checked={includeTests} onCheckedChange={setIncludeTests} />
        <Label htmlFor={`tests-${section}`} className="text-sm">{t('admin.revenue.includeTests')}</Label>
      </div>
      <span className="text-xs text-muted-foreground">{t('admin.revenue.timezoneNote')}</span>
    </div>
  );

  let content: React.ReactNode;
  if (q.isLoading) content = <ReportLoading />;
  else if (q.isError || !q.data) content = <ReportError onRetry={() => q.refetch()} />;
  else {
    const c = q.data.counts;
    const measured = q.data.ui_measured_signups;
    const trialToPaid = q.data.transitions.first_paid;
    const loss = biggestLoss(q.data.transitions);
    const asOf = q.data.generated_at;
    const open = (metric: string) => () => setDetail({ metric, asOf });
    const pct = (a: string, b: string) => formatRate(rate(c[a], c[b]), lang);
    const currencies = Object.keys(q.data.cash_net_cents);

    const funnel = (
      <Card>
        <CardHeader><CardTitle className="text-base">{t('admin.revenue.funnelTitle')}</CardTitle>
          <CardDescription>{t('admin.revenue.funnelNote', { measured: n(measured), total: n(c.signups) })}</CardDescription></CardHeader>
        <CardContent>
          <ol className="divide-y">
            {FUNNEL_STEPS.map((s, i) => {
              const unmeasured = s.ui && measured === 0;
              const transition = q.data.transitions[s.key];
              const base = s.ui ? measured : c.signups;
              return <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm">{label(s.key)} {s.ui && <Badge variant="outline" className="ml-1 text-[10px]">{t('admin.revenue.screenStep')}</Badge>}</span>
                {unmeasured
                  ? <span className="text-sm text-muted-foreground">{t('admin.revenue.notMeasured')}</span>
                  : <span className="flex items-center gap-3 text-sm tabular-nums">
                      <button type="button" className="font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" onClick={open(s.key)}>{n(c[s.key])}</button>
                      <span className="text-muted-foreground w-16 text-right" title={t('admin.revenue.ofCohort')}>{formatRate(rate(c[s.key], base), lang)}</span>
                      <span className="text-muted-foreground w-20 text-right" title={t('admin.revenue.fromPrevious')}>{i > 0 ? `↳ ${formatRate(transition ? rate(transition.advanced, transition.entered) : null, lang)}` : ''}</span>
                    </span>}
              </li>;
            })}
          </ol>
        </CardContent>
      </Card>
    );

    const lossCard = (
      <Kpi label={t('admin.revenue.biggestLoss')}
        value={loss ? `${n(loss.lost)} · ${formatRate(loss.rate, lang)}` : '—'}
        hint={loss ? `${label(loss.from)} → ${label(loss.to)}` : t('admin.revenue.noLoss')} />
    );

    const mrr = adminId && <PolarMrrCard adminId={adminId} />;

    const cash = (
      <div className="rounded-md border bg-card p-3">
        <span className="text-xs text-muted-foreground">{t('admin.revenue.cash')}</span>
        {q.data.undated_orders > 0 && <p className="text-xs text-muted-foreground">{t('admin.revenue.undatedOrders', { count: q.data.undated_orders })}</p>}
        {q.data.incomplete_orders > 0 && <p className="text-xs text-muted-foreground">{t('admin.revenue.incompleteOrders', { count: q.data.incomplete_orders })}</p>}
        {currencies.length === 0 && !q.data.incomplete_orders ? <p className="text-sm text-muted-foreground">{t('admin.revenue.noPayments')}</p>
          : currencies.map(cur => <p key={cur} className="text-lg font-semibold tabular-nums">{formatCents(q.data!.cash_net_cents[cur], cur, lang)}</p>)}
        {Object.entries(q.data.refunded_cents).map(([cur, v]) => <p key={cur} className="text-xs text-muted-foreground">{t('admin.revenue.refunded')}: {formatCents(v, cur, lang)}</p>)}
      </div>
    );

    if (section === 'overview') content = <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={label('signups')} value={n(c.signups)} onOpen={open('signups')} />
        <Kpi label={label('trial_started')} value={n(c.trial_started)} hint={pct('trial_started', 'signups')} onOpen={open('trial_started')} />
        <Kpi label={label('first_paid')} value={n(c.first_paid)} hint={trialToPaid && t('admin.revenue.paidFromTrials', { n: n(trialToPaid.advanced), d: n(trialToPaid.entered), rate: formatRate(rate(trialToPaid.advanced, trialToPaid.entered), lang) })} onOpen={open('first_paid')} />
        {lossCard}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{mrr}{cash}</div>
      {funnel}
    </div>;
    else if (section === 'trials') content = <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label={label('trial_24h')} value={formatRate(rate(c.trial_24h, c.mature_24h), lang)} hint={t('admin.revenue.ofMature', { n: n(c.trial_24h), d: n(c.mature_24h) })} onOpen={open('trial_24h')} />
      <Kpi label={label('trial_48h')} value={formatRate(rate(c.trial_48h, c.mature_48h), lang)} hint={t('admin.revenue.ofMature', { n: n(c.trial_48h), d: n(c.mature_48h) })} onOpen={open('trial_48h')} />
      <Kpi label={label('d7_paid')} value={formatRate(rate(c.d7_paid, c.d7_mature - c.d7_unknown), lang)} hint={t('admin.revenue.ofMature', { n: n(c.d7_paid), d: n(c.d7_mature - c.d7_unknown) })} onOpen={open('d7_paid')} />
      {c.d7_unknown > 0 && <Kpi label={label('d7_unknown')} value={n(c.d7_unknown)} onOpen={open('d7_unknown')} />}
      <Kpi label={label('d7_pending')} value={n(c.d7_pending)} onOpen={open('d7_pending')} />
      <Kpi label={label('trialing')} value={n(c.trialing)} onOpen={open('trialing')} />
      <Kpi label={label('renewal_off_access')} value={n(c.renewal_off_access)} onOpen={open('renewal_off_access')} />
    </div>;
    else content = <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label={label('first_paid')} value={n(c.first_paid)} onOpen={open('first_paid')} />
        <Kpi label={label('active_paid')} value={n(c.active_paid)} onOpen={open('active_paid')} />
        <Kpi label={label('first_renewal')} value={n(c.first_renewal)} hint={pct('first_renewal', 'first_paid')} onOpen={open('first_renewal')} />
        <Kpi label={label('renewal_off_access')} value={n(c.renewal_off_access)} onOpen={open('renewal_off_access')} />
        <Kpi label={label('past_due')} value={n(c.past_due)} onOpen={open('past_due')} />
        <Kpi label={label('lost_paid')} value={n(c.lost_paid)} hint={pct('lost_paid', 'first_paid')} onOpen={open('lost_paid')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{cash}{mrr}</div>
    </div>;
  }

  return <div className="space-y-4">
    {filters}
    {content}
    <DetailDialog asOf={detail?.asOf} metric={detail?.metric ?? null} filter={filter} onClose={() => setDetail(null)} />
  </div>;
}

function DetailDialog({ metric, filter, onClose, asOf }: { asOf?: string; metric: string | null; filter: RevenueFilter; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const size = 25;
  const q = useRevenueDetail(metric, filter, page, asOf, size);
  const fmt = (d: string | null) => d ? new Date(d).toLocaleString(i18n.language, { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : t('admin.revenue.notObserved');
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / size)) : 1;
  return <Dialog open={!!metric} onOpenChange={o => { if (!o) { onClose(); setPage(0); } }}>
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>{metric ? t(`admin.revenue.metric.${metric}`) : ''}</DialogTitle>
        <DialogDescription>{q.data ? t('admin.revenue.detailTotal', { count: q.data.total }) : ' '}</DialogDescription>
      </DialogHeader>
      {q.isLoading ? <ReportLoading /> : q.isError || !q.data ? <ReportError onRetry={() => q.refetch()} /> :
        q.data.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t('admin.revenue.empty')}</p> :
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
              <tr><th className="p-2">{t('admin.revenue.col.account')}</th><th className="p-2">{t('admin.revenue.col.signup')}</th><th className="p-2">{t('admin.revenue.col.trial')}</th><th className="p-2">{t('admin.revenue.col.firstPaid')}</th><th className="p-2">{t('admin.revenue.col.status')}</th></tr>
            </thead>
            <tbody className="divide-y">{q.data.rows.map(r => <tr key={r.user_id}>
              <td className="p-2 break-all">{r.email ?? r.user_id.slice(0, 8)} {r.is_test && <Badge variant="outline">{t('admin.revenue.test')}</Badge>}</td>
              <td className="p-2 whitespace-nowrap">{fmt(r.signup_at)}</td>
              <td className="p-2 whitespace-nowrap">{fmt(r.trial_start)}</td>
              <td className="p-2 whitespace-nowrap">{!r.first_paid_at && r.undated_payment ? t('admin.revenue.paidDatePending') : fmt(r.first_paid_at)}</td>
              <td className="p-2">{r.sub_status ? t(`admin.revenue.sub.${r.sub_status}`, r.sub_status) : t('admin.revenue.access.never_subscribed')}{r.renewal_off && ` · ${t('admin.revenue.renewalOff')}`}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t('admin.revenue.prev')}</Button>
        <span className="text-xs text-muted-foreground">{page + 1} / {pages}</span>
        <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>{t('admin.revenue.next')}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
