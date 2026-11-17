import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

export function PaymentRecovery() {
  const { t } = useTranslation();
  const { createCheckout, isCreatingCheckout, refetch } = useSubscription();
  async function openPortal() {
    try {
      window.location.assign(await createCheckout({ recovery: true }));
    } catch {
      toast.error(t('conversion.portalError'));
      void refetch();
    }
  }
  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label={t('conversion.payment_recovery')}>
      <p className="mb-3 text-sm">{t('conversion.recoveryBody')}</p>
      <Button onClick={openPortal} disabled={isCreatingCheckout}>{t('conversion.updatePayment')}</Button>
    </section>
  );
}
