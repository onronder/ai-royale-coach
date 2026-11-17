import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ReportError, ReportLoading } from './ReportState'
import { formatCents, formatRate, rate } from '@/lib/revenueFunnel'
import { FEEDBACK_REASONS } from '@/lib/firstValue'
interface Report {
  generated_at: string
  cohort: string
  enabled: boolean
  launched_at: string | null
  counts: Record<string, number>
  reasons: Record<string, number>
  errors: Record<string, number>
  costs: {
    calls: number
    input_tokens: number | null
    output_tokens: number | null
    cost_usd: number | null
    unknown_cost_calls: number
  }
  revenue30: {
    mature_accounts: number
    cash_net_cents: Record<string, number>
    undated_accounts: number
    unresolved_orders: number
    contribution: null
  }
  details: {
    total: number
    rows: {
      user_id: string
      email: string
      anchor_at: string
      feedback: string | null
      uncertain_calls: number
      paid_at: string | null
    }[]
  }
}
const steps = [
  'accounts',
  'screen_seen',
  'tag_help',
  'tag_found',
  'requested',
  'generated',
  'viewed',
  'matched',
  'offer_seen',
  'trial_start_clicked',
  'pricing_shown',
  'polar_continue_clicked',
  'checkout_created',
  'trial_started',
  'first_paid',
]
const outcomes = [
  'mature14',
  'paid14',
  'pending14',
  'undated_payment',
  'mature45',
  'renewed45',
  'uncertain',
  'responded',
  'unknown_reason',
]
export function FirstValuePanel() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage || 'en'
  const [cohort, setCohort] = useState('new'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [metric, setMetric] = useState('accounts'),
    [offset, setOffset] = useState(0),
    [asOf, setAsOf] = useState<string | undefined>()
  const q = useQuery({
    queryKey: ['first-value-report', cohort, from, to, metric, offset, asOf],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_first_value_report', {
        p_cohort: cohort,
        p_from: from || null,
        p_to: to || null,
        p_metric: metric,
        p_offset: offset,
        ...(asOf ? { p_at: asOf } : {}),
      })
      if (error) throw error
      return data as unknown as Report
    },
    retry: false,
    staleTime: 15000,
  })
  const reset = () => {
    setOffset(0)
    setAsOf(undefined)
    setMetric('accounts')
  }
  const open = (m: string) => {
    setMetric(m)
    setOffset(0)
    setAsOf(q.data?.generated_at)
  }
  const n = (v: number | null | undefined) =>
    v === null || v === undefined
      ? t('firstValue.admin.unknown')
      : new Intl.NumberFormat(lang).format(v)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('firstValue.admin.title')}</CardTitle>
        <CardDescription>{t('firstValue.admin.note')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="free-cohort">{t('firstValue.admin.details')}</Label>
            <select
              id="free-cohort"
              className="mt-1 block min-h-11 max-w-full rounded-md border bg-background px-3 text-sm"
              value={cohort}
              onChange={(e) => {
                setCohort(e.target.value)
                reset()
              }}
            >
              <option value="new">{t('firstValue.admin.new')}</option>
              <option value="returning">{t('firstValue.admin.returning')}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="free-from">{t('admin.trials.started')}</Label>
            <Input
              type="date"
              id="free-from"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                reset()
              }}
            />
          </div>
          <div>
            <Label htmlFor="free-to">{t('admin.trials.ends')}</Label>
            <Input
              type="date"
              id="free-to"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                reset()
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              void q.refetch()
            }}
          >
            {t('firstValue.reloadResult')}
          </Button>
        </div>
        {q.isLoading ? (
          <ReportLoading />
        ) : q.isError || !q.data ? (
          <ReportError onRetry={() => q.refetch()} />
        ) : (
          <>
            <Badge variant="outline">
              {t(q.data.enabled ? 'firstValue.admin.enabled' : 'firstValue.admin.closed')}
            </Badge>
            {!q.data.counts.accounts && <p>{t('firstValue.admin.empty')}</p>}
            <ol className="grid gap-2 sm:grid-cols-2">
              {steps.map((step) => (
                <li key={step}>
                  <button
                    type="button"
                    onClick={() => open(step)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>{t('firstValue.admin.metrics.' + step)}</span>
                    <strong className="tabular-nums">{n(q.data.counts[step])}</strong>
                  </button>
                </li>
              ))}
            </ol>
            <div className="grid gap-2 sm:grid-cols-3">
              {outcomes.map((m) => (
                <button
                  key={m}
                  onClick={() => open(m)}
                  className="min-h-16 rounded-md border p-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block text-xs text-muted-foreground">
                    {t('firstValue.admin.metrics.' + m)}
                  </span>
                  <strong className="text-xl">{n(q.data.counts[m])}</strong>
                  {m === 'paid14' && (
                    <span className="ml-2 text-sm">
                      {formatRate(rate(q.data.counts.paid14, q.data.counts.mature14), lang)}
                    </span>
                  )}
                  {m === 'renewed45' && (
                    <span className="ml-2 text-sm">
                      {formatRate(rate(q.data.counts.renewed45, q.data.counts.mature45), lang)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <section className="space-y-2">
              <h3 className="font-semibold">{t('firstValue.admin.reasons')}</h3>
              {FEEDBACK_REASONS.map((r) => (
                <div key={r} className="flex justify-between gap-3 text-sm">
                  <span>{t('firstValue.reasons.' + r)}</span>
                  <span>{n(q.data.reasons[r] || 0)}</span>
                </div>
              ))}
            </section>
            <section>
              <h3 className="font-semibold">{t('firstValue.admin.technicalErrors')}</h3>
              {Object.entries(q.data.errors).map(([code, count]) => (
                <p key={code} className="text-sm">
                  {t('firstValue.errors.' + code)}: {n(count)}
                </p>
              ))}
            </section>
            <section className="rounded-md border p-4">
              <p>
                {t('firstValue.admin.calls')}: {n(q.data.costs.calls)}
              </p>
              <p>
                {t('firstValue.admin.tokens')}: {n(q.data.costs.input_tokens)} /{' '}
                {n(q.data.costs.output_tokens)}
              </p>
              <p>
                {t('firstValue.admin.cost')}: {n(q.data.costs.cost_usd)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t('firstValue.admin.costNote')}</p>
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold">{t('firstValue.admin.revenue')}</h3>
              <p>
                {n(q.data.revenue30.mature_accounts)}{' '}
                {t('firstValue.admin.details').toLocaleLowerCase(lang)}
              </p>
              {Object.entries(q.data.revenue30.cash_net_cents).map(([currency, cents]) => (
                <p key={currency}>{formatCents(cents, currency, lang)}</p>
              ))}
              <p>
                {t('firstValue.admin.metrics.undated_payment')}:{' '}
                {n(q.data.revenue30.undated_accounts)}
              </p>
              <p>
                {t('firstValue.admin.unresolvedOrders')}: {n(q.data.revenue30.unresolved_orders)}
              </p>
              <p className="text-sm text-muted-foreground">{t('firstValue.admin.revenueNote')}</p>
            </section>
            <section className="space-y-3">
              <h3 className="font-semibold">
                {t('firstValue.admin.metrics.' + metric)} · {n(q.data.details.total)}
              </h3>
              {q.data.details.rows.map((row) => (
                <div key={row.user_id} className="rounded-md border p-3 text-sm">
                  <p className="break-all font-medium">{row.email}</p>
                  <p className="text-muted-foreground">
                    {new Intl.DateTimeFormat(lang, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Europe/Istanbul',
                    }).format(new Date(row.anchor_at))}
                  </p>
                  {row.feedback && <p>{t('firstValue.reasons.' + row.feedback)}</p>}
                  {row.uncertain_calls > 0 && (
                    <Badge variant="outline">{t('firstValue.admin.metrics.uncertain')}</Badge>
                  )}
                </div>
              ))}
              <div className="flex gap-3">
                <Button variant="outline" disabled={!offset} onClick={() => setOffset(offset - 25)}>
                  {t('firstValue.admin.previous')}
                </Button>
                <Button
                  variant="outline"
                  disabled={offset + 25 >= q.data.details.total}
                  onClick={() => {
                    setAsOf(q.data.generated_at)
                    setOffset(offset + 25)
                  }}
                >
                  {t('firstValue.admin.next')}
                </Button>
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
