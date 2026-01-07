import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFeatureAccess, FeatureName } from "@/hooks/useFeatureAccess";
import { PricingModal } from "@/components/subscription/PricingModal";

interface FeatureGateProps {
  feature: FeatureName;
  playerTag: string;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  showUsageIndicator?: boolean;
}

export function FeatureGate({
  feature,
  playerTag,
  children,
  fallback,
  className,
  showUsageIndicator = false,
}: FeatureGateProps) {
  const { t } = useTranslation();
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const {
    canAccess,
    isLoading,
    accessResult,
    usageCount,
    dailyLimit,
    remainingUses,
  } = useFeatureAccess(feature, playerTag);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("relative", className)}>
        <div className="animate-pulse bg-muted/50 rounded-lg p-8 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Access granted
  if (canAccess) {
    return (
      <div className={cn("relative", className)}>
        {children}
        {showUsageIndicator && accessResult?.reason === 'daily_free' && (
          <div className="absolute top-2 right-2 text-xs bg-background/90 backdrop-blur px-2 py-1 rounded-full border border-border">
            {usageCount}/{dailyLimit} {t('common.today')}
          </div>
        )}
      </div>
    );
  }

  // Access denied - show fallback or locked state
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked state
  const isFraudDetected = accessResult?.reason === 'fraud_detected';
  const isQuotaExceeded = accessResult?.reason === 'quota_exceeded';

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Blurred content preview */}
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border border-border">
          <div className="text-center p-6 max-w-sm">
            {isFraudDetected ? (
              <>
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-rajdhani font-bold text-lg mb-2">
                  {t('subscription.tagClaimedTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {accessResult?.message || t('subscription.tagClaimedMessage')}
                </p>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-6 w-6 text-gold" />
                </div>
                <h3 className="font-rajdhani font-bold text-lg mb-2">
                  {isQuotaExceeded 
                    ? t('subscription.dailyLimitReached')
                    : t('subscription.featureLocked')
                  }
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isQuotaExceeded 
                    ? t('subscription.dailyLimitMessage', { used: usageCount, limit: dailyLimit })
                    : t('subscription.upgradeToUnlock')
                  }
                </p>
                <Button
                  onClick={() => setShowPricingModal(true)}
                  className="bg-gradient-gold text-gold-foreground hover:shadow-gold"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {t('subscription.upgradeForUnlimited')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal}
      />
    </>
  );
}
