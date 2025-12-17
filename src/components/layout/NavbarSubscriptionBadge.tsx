import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Crown, Clock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "@/components/subscription/PricingModal";
import { cn } from "@/lib/utils";

export function NavbarSubscriptionBadge() {
  const { t } = useTranslation();
  const [showPricing, setShowPricing] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);
  const { 
    hasAccess, 
    isTrialActive, 
    trialDaysRemaining,
    hasUsedTrial,
    subscriptionStatus,
    status,
    isLoading 
  } = useSubscription();

  // Calculate hours remaining for trial
  useEffect(() => {
    if (status?.trial?.endsAt && isTrialActive) {
      const calculateHours = () => {
        const endsAt = new Date(status.trial.endsAt!);
        const now = new Date();
        const diffMs = endsAt.getTime() - now.getTime();
        const hours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
        setHoursRemaining(hours);
      };
      
      calculateHours();
      // Update every minute for accuracy
      const interval = setInterval(calculateHours, 60000);
      return () => clearInterval(interval);
    }
  }, [status?.trial?.endsAt, isTrialActive]);

  if (isLoading) return null;

  // Active subscriber - show PRO ENABLED badge
  if (hasAccess && subscriptionStatus === 'active') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30">
        <Crown className="h-3.5 w-3.5 text-gold" />
        <span className="text-xs font-bold text-gold uppercase tracking-wide">
          {t('subscription.navBadge.proEnabled', 'PRO ENABLED')}
        </span>
      </div>
    );
  }

  // Trial active - show countdown WITH explicit upgrade button
  if (isTrialActive && hoursRemaining > 0) {
    const isLowTime = hoursRemaining <= 24;
    const displayTime = hoursRemaining > 24 
      ? t('subscription.navBadge.trialDays', '{{days}}d left', { days: trialDaysRemaining })
      : t('subscription.navBadge.trialHours', '{{hours}}h left', { hours: hoursRemaining });
    
    return (
      <>
        <div className="flex items-center gap-2">
          {/* Trial countdown indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full border",
              isLowTime 
                ? "bg-destructive/20 border-destructive/30 text-destructive animate-pulse" 
                : "bg-primary/20 border-primary/30 text-primary"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">
              {displayTime}
            </span>
          </div>
          
          {/* Explicit upgrade button - always visible during trial */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPricing(true)}
            className="h-7 px-2.5 text-xs border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/50 gap-1.5"
          >
            <Crown className="h-3 w-3" />
            {t('subscription.navBadge.upgrade', 'Upgrade')}
          </Button>
        </div>
        <PricingModal open={showPricing} onOpenChange={setShowPricing} />
      </>
    );
  }

  // Trial expired, no subscription - show AI DISABLED
  if (hasUsedTrial && !hasAccess) {
    return (
      <>
        <button
          onClick={() => setShowPricing(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/20 border border-destructive/30 text-destructive transition-all hover:scale-105 hover:bg-destructive/30"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {t('subscription.navBadge.aiDisabled', 'AI DISABLED')}
          </span>
        </button>
        <PricingModal open={showPricing} onOpenChange={setShowPricing} />
      </>
    );
  }

  // Free user who hasn't used trial - show upgrade button
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
