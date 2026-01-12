import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Brain, Shield, Zap, Users, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { icon: Brain, key: 'aiCoach' },
  { icon: Zap, key: 'deckAnalysis' },
  { icon: Shield, key: 'matchPredictions' },
];

interface PricingTier {
  slots: number;
  price: string;
  pricePerAccount: string;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  { slots: 1, price: '$4.99', pricePerAccount: '$4.99' },
  { slots: 2, price: '$6.98', pricePerAccount: '$3.49', popular: true },
  { slots: 3, price: '$8.97', pricePerAccount: '$2.99' },
];

interface PendingPromo {
  code: string;
  discountId: string;
  discountPercent: number;
}

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const { t } = useTranslation();
  const { createCheckout, isCreatingCheckout, isTrialActive, trialDaysRemaining } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [showTrialConfirm, setShowTrialConfirm] = useState(false);
  
  // Promo code state
  const [pendingPromo, setPendingPromo] = useState<PendingPromo | null>(null);
  const [isLoadingPromo, setIsLoadingPromo] = useState(false);

  // Check for pending promo code when modal opens
  useEffect(() => {
    const checkPendingPromo = async () => {
      const storedCode = localStorage.getItem('pending_promo_code');
      if (!storedCode) return;

      setIsLoadingPromo(true);
      try {
        const { data, error } = await supabase.functions.invoke('lookup-discount', {
          body: { promoCode: storedCode },
        });

        if (error) {
          console.error('[PricingModal] Error looking up discount:', error);
          localStorage.removeItem('pending_promo_code');
          return;
        }

        if (data?.isValid && data?.discountId) {
          setPendingPromo({
            code: data.code,
            discountId: data.discountId,
            discountPercent: data.discountPercent,
          });
          console.log('[PricingModal] Promo validated:', data);
        } else {
          console.log('[PricingModal] Invalid promo code:', storedCode, data?.error);
          localStorage.removeItem('pending_promo_code');
        }
      } catch (err) {
        console.error('[PricingModal] Promo lookup error:', err);
        localStorage.removeItem('pending_promo_code');
      } finally {
        setIsLoadingPromo(false);
      }
    };

    if (open) {
      checkPendingPromo();
    }
  }, [open]);

  const proceedToCheckout = async () => {
    try {
      const checkoutUrl = await createCheckout({
        accountSlots: selectedTier,
        successUrl: `${window.location.origin}/select-player?subscription=success`,
        // Pass discount ID if we have a valid promo code
        discountId: pendingPromo?.discountId,
      });
      
      // Clear the promo code after successful checkout redirect
      localStorage.removeItem('pending_promo_code');
      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error(t('subscription.checkoutError'));
    }
  };

  const handleSubscribe = async () => {
    // If user has active trial, show confirmation dialog
    if (isTrialActive && trialDaysRemaining > 0) {
      setShowTrialConfirm(true);
      return;
    }
    await proceedToCheckout();
  };

  // Calculate discounted price for display
  const getDisplayPrice = (originalPrice: string) => {
    if (!pendingPromo?.discountPercent || pendingPromo.discountPercent <= 0) return originalPrice;
    const price = parseFloat(originalPrice.replace('$', ''));
    const discounted = price * (1 - pendingPromo.discountPercent / 100);
    return `$${discounted.toFixed(2)}`;
  };

  // Check if we should show discounted pricing
  const hasPercentDiscount = pendingPromo && pendingPromo.discountPercent > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl border-gold/30 bg-gradient-to-br from-card via-card to-gold/5 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-2">
              <Crown className="h-8 w-8 text-gold" />
            </div>
            <DialogTitle className="text-2xl font-rajdhani text-embossed">
              {t('subscription.unlockPro')}
            </DialogTitle>
            <DialogDescription>
              {t('subscription.proDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Promo code banner */}
            {pendingPromo && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <Gift className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {pendingPromo.discountPercent > 0 
                      ? t('subscription.promo.discountApplied', { percent: pendingPromo.discountPercent })
                      : t('subscription.promo.discountApplied', { percent: '' }).replace('% ', '')}{' '}
                    <span className="font-mono font-bold">{pendingPromo.code}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('subscription.promo.autoApply')}
                  </p>
                </div>
              </div>
            )}

            {isLoadingPromo && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('subscription.promo.checkingPromo')}
                </span>
              </div>
            )}

            {/* Tier Selection */}
            <div className="grid grid-cols-3 gap-3">
              {pricingTiers.map((tier) => (
                <button
                  key={tier.slots}
                  onClick={() => setSelectedTier(tier.slots)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all text-left",
                    selectedTier === tier.slots
                      ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                      : "border-border/50 hover:border-gold/30 hover:bg-muted/50"
                  )}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gold text-black text-[10px] px-2">
                      {t('subscription.popular')}
                    </Badge>
                  )}
                  
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('subscription.accounts', { count: tier.slots })}
                    </span>
                  </div>
                  
                  <div className="text-2xl font-bold font-rajdhani text-gold">
                    {hasPercentDiscount ? getDisplayPrice(tier.price) : tier.price}
                  </div>
                  {hasPercentDiscount && (
                    <div className="text-sm text-muted-foreground line-through">
                      {tier.price}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    /{t('subscription.month')}
                  </div>
                  
                  <div className="mt-2 text-xs text-emerald-500">
                    {tier.pricePerAccount}/{t('subscription.perAccount')}
                  </div>

                  {selectedTier === tier.slots && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-gold" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-3 py-4 border-y border-border/50">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('subscription.includedFeatures')}
              </h4>
              {features.map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{t(`subscription.features.${key}`)}</span>
                  <Check className="ml-auto h-4 w-4 text-emerald-500" />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-gold" />
                </div>
                <span className="text-sm">
                  {t('subscription.aiOnAccounts', { count: selectedTier })}
                </span>
                <Check className="ml-auto h-4 w-4 text-emerald-500" />
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-3">
              <Button 
                onClick={handleSubscribe}
                disabled={isCreatingCheckout || isLoadingPromo}
                className="w-full bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-gold/90 hover:to-yellow-500/90 font-semibold"
              >
                <Crown className="mr-2 h-4 w-4" />
                {isCreatingCheckout 
                  ? t('common.loading') 
                  : pendingPromo && pendingPromo.discountPercent > 0
                    ? `${t('subscription.subscribeTier', { price: getDisplayPrice(pricingTiers.find(tier => tier.slots === selectedTier)?.price || '$4.99') })} ${t('subscription.promo.discountOff', { percent: pendingPromo.discountPercent })}`
                    : t('subscription.subscribeTier', { price: pricingTiers.find(tier => tier.slots === selectedTier)?.price })
                }
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {t('subscription.cancelAnytime')}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trial confirmation dialog */}
      <AlertDialog open={showTrialConfirm} onOpenChange={setShowTrialConfirm}>
        <AlertDialogContent className="border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('subscription.trialConfirm.title', 'Subscribe Now?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('subscription.trialConfirm.description', 'You still have {{days}} day(s) left on your free trial. Your paid subscription will start immediately if you proceed.', { days: trialDaysRemaining })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={proceedToCheckout}
              className="bg-gold text-black hover:bg-gold/90"
            >
              {t('subscription.trialConfirm.proceed', 'Subscribe Now')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
