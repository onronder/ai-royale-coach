import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserDirectory } from '@/hooks/useRevenueReports';
import { ReportError, ReportLoading } from './ReportState';

export function UserDirectoryPanel() {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { const id = setTimeout(() => { setSearch(input.trim()); setPage(0); }, 300); return () => clearTimeout(id); }, [input]);
  const q = useUserDirectory(search, page);
  const size = 25;
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / size)) : 1;
  const fmt = (d: string) => new Date(d).toLocaleDateString(i18n.language, { timeZone: 'Europe/Istanbul' });
  return <Card>
    <CardHeader>
      <CardTitle className="text-base">{t('admin.revenue.directoryTitle')}</CardTitle>
      <CardDescription>{t('admin.revenue.directoryNote')}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <Input value={input} onChange={e => setInput(e.target.value)} placeholder={t('admin.revenue.searchPlaceholder')} aria-label={t('admin.revenue.searchPlaceholder')} className="max-w-sm" />
      {q.isLoading ? <ReportLoading /> : q.isError || !q.data ? <ReportError onRetry={() => q.refetch()} /> :
        q.data.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t('admin.revenue.empty')}</p> :
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>
              <th className="p-2">{t('admin.revenue.col.account')}</th><th className="p-2">{t('admin.revenue.col.signup')}</th>
              <th className="p-2">{t('admin.revenue.col.lastStep')}</th><th className="p-2">{t('admin.revenue.col.access')}</th>
              <th className="p-2">{t('admin.revenue.col.marketing')}</th><th className="p-2">{t('admin.revenue.col.security')}</th>
            </tr></thead>
            <tbody className="divide-y">{q.data.rows.map(r => <tr key={r.user_id}>
              <td className="p-2"><div className="break-all">{r.email ?? r.user_id.slice(0, 8)}</div>{r.tags.length > 0 && <div className="text-xs text-muted-foreground">{r.tags.join(', ')}</div>}</td>
              <td className="p-2 whitespace-nowrap">{fmt(r.signup_at)}</td>
              <td className="p-2">{r.last_step ? t(`admin.revenue.step.${r.last_step}`) : t('admin.revenue.notObserved')}</td>
              <td className="p-2">{t(`admin.revenue.access.${r.access}`)}{r.renewal_off && <span className="block text-xs text-muted-foreground">{t('admin.revenue.renewalOff')}</span>}</td>
              <td className="p-2">{t(`admin.revenue.marketing.${r.marketing}`, r.marketing)}</td>
              <td className="p-2"><Badge variant={r.security === 'blocked' ? 'destructive' : r.security === 'review' ? 'secondary' : 'outline'}>{t(`admin.revenue.security.${r.security}`)}</Badge></td>
            </tr>)}</tbody>
          </table>
        </div>}
      {q.data && <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t('admin.revenue.prev')}</Button>
        <span className="text-xs text-muted-foreground">{t('admin.revenue.detailTotal', { count: q.data.total })} · {page + 1} / {pages}</span>
        <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>{t('admin.revenue.next')}</Button>
      </div>}
    </CardContent>
  </Card>;
}
