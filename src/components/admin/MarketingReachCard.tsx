import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportError, ReportLoading } from './ReportState';

type Reach = { active_paid: number; active_trial: number; already_chose: number; invitable: number; waiting_missing_info: number; waiting_by_reason: Record<string, number> };

/** Read-only view of the server's admin_marketing_reach() (one row per account with current access). Nothing is derived here. */
export function MarketingReachCard() {
  const { t, i18n } = useTranslation();
  const q = useQuery({
    queryKey: ['admin-marketing-reach'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_marketing_reach' as never);
      if (error) throw error;
      return data as unknown as Reach;
    },
  });
  const n = (v: number | undefined) => new Intl.NumberFormat(i18n.language).format(v ?? 0);
  return <Card>
    <CardHeader>
      <CardTitle className="text-base">{t('admin.revenue.reach.title')}</CardTitle>
      <CardDescription>{t('admin.revenue.reach.note')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {q.isLoading ? <ReportLoading /> : q.isError || !q.data ? <ReportError onRetry={() => q.refetch()} /> : <>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(['active_paid', 'active_trial', 'already_chose', 'invitable', 'waiting_missing_info'] as const).map(k =>
            <div key={k} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{t(`admin.revenue.reach.${k}`)}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{n(q.data![k])}</dd></div>)}
        </dl>
        {Object.keys(q.data.waiting_by_reason).length > 0 && <ul className="flex flex-wrap gap-2 text-xs" aria-label={t('admin.revenue.reach.reasons')}>
          {Object.entries(q.data.waiting_by_reason).map(([k, v]) => <li key={k} className="rounded border px-2 py-1">{t(`admin.revenue.reach.reason.${k}`, k)}: <span className="font-semibold tabular-nums">{n(v)}</span></li>)}
        </ul>}
      </>}
    </CardContent>
  </Card>;
}
