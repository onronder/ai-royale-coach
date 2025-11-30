import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, Brain, Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { icon: Brain, key: 'aiCoach' },
  { icon: Zap, key: 'deckAnalysis' },
  { icon: Shield, key: 'matchPredictions' },
  { icon: Users, key: 'multiAccount' },
];

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const { t } = useTranslation();
  const { hasUsedTrial, startTrial, isStartingTrial, createCheckout, isCreatingCheckout } = useSubscription();

  const handleStartTrial = async () => {
    try {
      await startTrial();
      toast.success(t('subscription.trialStarted'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('subscription.trialError'));
    }
  };

  const handleSubscribe = async () => {
    try {
      const checkoutUrl = await createCheckout({
        successUrl: `${window.location.origin}/select-player?subscription=success`,
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error(t('subscription.checkoutError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-gold/30 bg-gradient-to-br from-card via-card to-gold/5">
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

        <div className="space-y-4 py-4">
          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold font-rajdhani text-gold">$4.99</span>
              <span className="text-muted-foreground">/{t('subscription.month')}</span>
            </div>
            <Badge variant="outline" className="mt-2 border-emerald-500/50 text-emerald-500 bg-emerald-500/10">
              {t('subscription.threeAccountsIncluded')}
            </Badge>
          </div>

          {/* Features */}
          <div className="space-y-3 py-4 border-y border-border/50">
            {features.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{t(`subscription.features.${key}`)}</span>
                <Check className="ml-auto h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            {!hasUsedTrial && (
              <Button 
                onClick={handleStartTrial}
                disabled={isStartingTrial}
                variant="outline"
                className="w-full border-gold/50 hover:bg-gold/10"
              >
                <Sparkles className="mr-2 h-4 w-4 text-gold" />
                {isStartingTrial ? t('common.loading') : t('subscription.startThreeDayTrial')}
              </Button>
            )}
            <Button 
              onClick={handleSubscribe}
              disabled={isCreatingCheckout}
              className="w-full bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-gold/90 hover:to-yellow-500/90 font-semibold"
            >
              <Crown className="mr-2 h-4 w-4" />
              {isCreatingCheckout ? t('common.loading') : t('subscription.subscribeNow')}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('subscription.cancelAnytime')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
