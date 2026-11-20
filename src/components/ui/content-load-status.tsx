import { useTranslation } from 'react-i18next';
import { Button } from './button';
export function ContentLoadStatus({ failed = false }: { failed?: boolean }) {
 const { t } = useTranslation();
 return <div role={failed ? 'alert' : 'status'} className="p-4 text-center">
  <p>{t(failed ? 'errors.screenFailed' : 'common.loading')}</p>
  {failed && <Button variant="outline" onClick={() => window.location.reload()}>{t('errors.reload')}</Button>}
 </div>;
}
