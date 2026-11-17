import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUnstartedAudience } from '@/hooks/useRevenueReports';
import { ReportError, ReportLoading } from './ReportState';

/** Read-only audience size. No campaign, coupon or send button here by design. */
export function UnstartedAudienceCard() {
  const { t, i18n } = useTranslation();
  const [includeTests, setIncludeTests] = useState(false);
  const q = useUnstartedAudience(includeTests);
  const n = (v: number) => new Intl.NumberFormat(i18n.language).format(v);
  return <Card>
    <CardHeader>
      <CardTitle className="text-base">{t('admin.revenue.unstartedTitle')}</CardTitle>
      <CardDescription>{t('admin.revenue.unstartedNote')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch id="unstarted-tests" checked={includeTests} onCheckedChange={setIncludeTests} />
        <Label htmlFor="unstarted-tests" className="text-sm">{t('admin.revenue.includeTests')}</Label>
      </div>
      {q.isLoading ? <ReportLoading /> : q.isError || !q.data ? <ReportError onRetry={() => q.refetch()} /> :
        <dl className="grid grid-cols-3 gap-3">
          {(['total', 'consented', 'sendable'] as const).map(k => <div key={k} className="rounded-md border p-3">
            <dt className="text-xs text-muted-foreground">{t(`admin.revenue.unstarted.${k}`)}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{n(q.data![k])}</dd>
          </div>)}
        </dl>}
    </CardContent>
  </Card>;
}
