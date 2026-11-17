import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { formatCents, istanbulDate } from '@/lib/revenueFunnel';
import { Button } from '@/components/ui/button';

export function PolarMrrCard({ adminId }: { adminId: string }) {
  const { t, i18n } = useTranslation();
  const today = istanbulDate();
  const q = useQuery({
    queryKey: ['admin-polar-mrr', adminId, today],
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ cents: number; currency: string; date: string }>('polar-mrr');
      if (error || !data || !Number.isFinite(data.cents) || data.currency !== 'USD' || data.date !== istanbulDate()) throw new Error('MRR unavailable');
      return data;
    },
  });
  return <div className="rounded-md border bg-card p-3">
    <span className="text-xs text-muted-foreground">{t('admin.revenue.mrr')}</span>
    {q.isLoading ? <p role="status">{t('admin.revenue.loading')}</p> : q.isError || !q.data ? (
      <div role="status">
        <p className="text-sm">{t('admin.revenue.mrrUnavailable')}</p>
        <Button size="sm" variant="ghost" onClick={() => q.refetch()}>{t('admin.revenue.retry')}</Button>
      </div>
    ) : <>
      <p className="text-lg font-semibold tabular-nums">{formatCents(q.data.cents, q.data.currency, i18n.language)}</p>
      <p className="text-xs text-muted-foreground">{t('admin.revenue.mrrScope', { date: q.data.date })}</p>
    </>}
  </div>;
}
