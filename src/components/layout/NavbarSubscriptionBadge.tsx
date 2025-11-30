import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Crown, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "@/components/subscription/PricingModal";
import { cn } from "@/lib/utils";

export function NavbarSubscriptionBadge() {
  const { t } = useTranslation();
  const [showPricing, setShowPricing] = useState(false);
  const { 
    hasAccess, 
    isTrialActive, 
    trialDaysRemaining, 
    subscriptionStatus,
    isLoading 
  } = useSubscription();

  if (isLoading) return null;

  // Active subscriber - show PRO badge
  if (hasAccess && subscriptionStatus === 'active') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30">
        <Crown className="h-3.5 w-3.5 text-gold" />
        <span className="text-xs font-bold text-gold uppercase tracking-wide">
          {t('subscription.navBadge.pro', 'PRO')}
        </span>
      </div>
    );
  }

  // Trial active - show days remaining
  if (isTrialActive && trialDaysRemaining > 0) {
    const isLowDays = trialDaysRemaining <= 1;
    return (
      <>
        <button
          onClick={() => setShowPricing(true)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:scale-105",
            isLowDays 
              ? "bg-destructive/20 border-destructive/30 text-destructive" 
              : "bg-primary/20 border-primary/30 text-primary"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">
            {t('subscription.navBadge.trialDays', '{{days}}d left', { days: trialDaysRemaining })}
          </span>
        </button>
        <PricingModal open={showPricing} onOpenChange={setShowPricing} />
      </>
    );
  }

  // Free user - show upgrade button
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPricing(true)}
        className="h-7 px-2.5 text-xs border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/50 gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t('subscription.navBadge.upgrade', 'Upgrade')}
      </Button>
      <PricingModal open={showPricing} onOpenChange={setShowPricing} />
    </>
  );
}
