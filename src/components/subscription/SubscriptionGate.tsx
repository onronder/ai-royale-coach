import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";
import { PricingModal } from "./PricingModal";

interface SubscriptionGateProps {
  children: ReactNode;
  feature?: string;
  showUpgradePrompt?: boolean;
}

export function SubscriptionGate({ children, feature = "this feature", showUpgradePrompt = true }: SubscriptionGateProps) {
  const { t } = useTranslation();
  const { hasAccess, isLoading } = useSubscription();
  const [showPricingModal, setShowPricingModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <>
      <Card className="border-gold/30 bg-gradient-to-br from-card via-card to-gold/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-gold" />
          </div>
          <CardTitle className="text-xl font-rajdhani">
            {t('subscription.unlockFeature', { feature })}
          </CardTitle>
          <CardDescription>
            {t('subscription.trialExpiredDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => setShowPricingModal(true)}
              className="w-full bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-gold/90 hover:to-yellow-500/90"
            >
              <Crown className="mr-2 h-4 w-4" />
              {t('subscription.viewPlans')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('subscription.priceInfo')}
          </p>
        </CardContent>
      </Card>
      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </>
  );
}
