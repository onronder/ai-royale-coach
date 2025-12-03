import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Brain, Shield, Zap, Users } from "lucide-react";
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

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const { t } = useTranslation();
  const { createCheckout, isCreatingCheckout } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<number>(1);

  const handleSubscribe = async () => {
    try {
      const checkoutUrl = await createCheckout({
        accountSlots: selectedTier,
        successUrl: `${window.location.origin}/select-player?subscription=success`,
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error(t('subscription.checkoutError'));
    }
  };

  return (
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
                  {tier.price}
                </div>
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
              disabled={isCreatingCheckout}
              className="w-full bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-gold/90 hover:to-yellow-500/90 font-semibold"
            >
              <Crown className="mr-2 h-4 w-4" />
              {isCreatingCheckout 
                ? t('common.loading') 
                : t('subscription.subscribeTier', { price: pricingTiers.find(t => t.slots === selectedTier)?.price })
              }
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
