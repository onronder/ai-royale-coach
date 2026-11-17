import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shared loading / error states: a failed query is never shown as 0. */
export function ReportLoading() {
  const { t } = useTranslation();
  return <div role="status" aria-live="polite" className="flex items-center gap-2 py-8 text-muted-foreground justify-center">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t('admin.revenue.loading')}
  </div>;
}

export function ReportError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 py-6 text-center">
    <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" aria-hidden />{t('admin.revenue.error')}</p>
    <Button size="sm" variant="outline" onClick={onRetry}>{t('admin.revenue.retry')}</Button>
  </div>;
}
