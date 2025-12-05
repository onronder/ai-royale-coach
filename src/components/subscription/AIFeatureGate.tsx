import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlayerAIAccess } from "@/hooks/usePlayerAIAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, Settings, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PricingModal } from "./PricingModal";

interface AIFeatureGateProps {
  playerTag: string;
  children: ReactNode;
  feature?: string;
  showLoadingState?: boolean;
}

export function AIFeatureGate({ 
  playerTag, 
  children, 
  feature = "AI features",
  showLoadingState = true
}: AIFeatureGateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAccess: hasSubscriptionAccess, isTrialActive: subscriptionTrialActive, isLoading: isSubLoading } = useSubscription();
  const { hasAIAccess, isTrialActive: playerTrialActive, isLoading: isAILoading } = usePlayerAIAccess(playerTag);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const isLoading = isSubLoading || isAILoading;
  
  // Trial is active from either source
  const isTrialActive = subscriptionTrialActive || playerTrialActive;

  if (isLoading && showLoadingState) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Trial users get FULL access to ALL AI features - bypass all checks
  if (isTrialActive) {
    return <>{children}</>;
  }

  // No subscription and no trial - show subscription prompt
  if (!hasSubscriptionAccess) {
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
              {t('subscription.premiumDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowPricingModal(true)}
              className="w-full bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-gold/90 hover:to-yellow-500/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t('subscription.viewPlans')}
            </Button>
          </CardContent>
        </Card>
        <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
      </>
    );
  }

  // Has subscription but AI not enabled for this specific player account
  if (!hasAIAccess) {
    return (
      <Card className="border-accent/30 bg-gradient-to-br from-card via-card to-accent/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <Bot className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-xl font-rajdhani">
            {t('subscription.aiNotEnabledTitle')}
          </CardTitle>
          <CardDescription>
            {t('subscription.aiNotEnabledForAccount')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            {t('subscription.enableAIInSettings')}
          </p>
          <Button 
            onClick={() => navigate('/settings')}
            variant="outline"
            className="w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            {t('subscription.manageAIAccounts')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Has both subscription and AI access for this account
  return <>{children}</>;
}
