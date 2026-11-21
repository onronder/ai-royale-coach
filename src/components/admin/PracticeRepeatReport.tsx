import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export function PracticeRepeatReport({ days }: { days: number }) {
  const { t, i18n } = useTranslation();
  const report = useQuery({
    queryKey: ['admin-practice-repeat', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_practice_repeat', { p_days: days });
      if (error) throw error;
      return data;
    },
  });
  const value = (n: number, d: number) =>
    (d
      ? new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 }).format(n / d)
      : '—') + ' (' + n + '/' + d + ')';
  const window = report.data?.[0];
  const utc = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
  const dates = (from: string, through: string) => ({
    from: utc.format(new Date(from)), through: utc.format(new Date(through)),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('practiceRepeat.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {report.isError
          ? (
            <p role='alert'>
              {t('conversion.overview.loadError')}{' '}
              <Button variant='outline' onClick={() => void report.refetch()}>{t('common.retry')}</Button>
            </p>
          )
          : report.isLoading
          ? <p role='status'>{t('coaching.loading')}</p>
          : (
            <>
              <div className='grid gap-4 md:grid-cols-2'>
                {report.data?.map((row) => (
                  <section key={row.tier}>
                    <h3 className='font-semibold'>{t('practiceRepeat.' + row.tier)}</h3>
                    <dl className='text-sm'>
                      {([
                        ['accepted', row.acceptors, row.viewers],
                        ['returned', row.returned, row.mature],
                        ['matched', row.matched, row.mature],
                      ] as const).map(([metric, count, total]) => (
                        <div key={metric} className='flex justify-between gap-2'>
                          <dt>{t('practiceRepeat.' + metric)}</dt>
                          <dd className='whitespace-nowrap'>{value(count, total)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
              {window && <div className='mt-2 space-y-1 text-xs text-muted-foreground'>
                <p>{t('practiceRepeat.exposureWindow', dates(window.exposure_from, window.exposure_through))}</p>
                <p>{t('practiceRepeat.mature', dates(window.accepted_from, window.accepted_through))}</p>
              </div>}
            </>
          )}
      </CardContent>
    </Card>
  );
}
