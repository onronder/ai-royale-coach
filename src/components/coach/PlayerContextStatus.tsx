import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function PlayerContextStatus({ failed, retry }: { failed: boolean; retry?: () => unknown }) {
  const { t } = useTranslation();
  return <div className="p-4 text-center text-muted-foreground" role={failed ? 'alert' : 'status'}>
    <p>{t(failed ? 'common.error' : 'common.loading')}</p>
    {failed && retry && <Button variant="outline" className="mt-2" onClick={() => retry()}>{t('common.retry')}</Button>}
  </div>;
}
