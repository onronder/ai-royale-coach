import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Clock, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionStatusProps {
  compact?: boolean;
}

export function SubscriptionStatus({ compact = false }: SubscriptionStatusProps) {
  const { t } = useTranslation();
  const { 
    hasAccess, 
    isTrialActive, 
    trialDaysRemaining, 
    subscriptionStatus,
    hasUsedTrial,
    accountSlots,
    createCheckout,
    isCreatingCheckout,
    startTrial,
    isStartingTrial,
  } = useSubscription();

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

  const handleStartTrial = async () => {
    try {
      await startTrial();
      toast.success(t('subscription.trialStarted'));
    } catch (error) {
      toast.error(t('subscription.trialError'));
    }
  };

  if (compact) {
    if (subscriptionStatus === 'active') {
      return (
        <Badge variant="outline" className="border-gold/50 text-gold bg-gold/10">
          <Crown className="mr-1 h-3 w-3" />
          PRO
        </Badge>
      );
    }
    
    if (isTrialActive) {
      return (
        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
          <Clock className="mr-1 h-3 w-3" />
          {t('subscription.trialDaysLeft', { days: trialDaysRemaining })}
        </Badge>
      );
    }

    return (
      <Button 
        size="sm" 
        variant="outline"
        onClick={hasUsedTrial ? handleSubscribe : handleStartTrial}
        disabled={isCreatingCheckout || isStartingTrial}
        className="border-gold/50 hover:bg-gold/10 text-gold"
      >
        <Sparkles className="mr-1 h-3 w-3" />
        {hasUsedTrial ? t('subscription.upgrade') : t('subscription.tryFree')}
      </Button>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscriptionStatus === 'active' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-semibold font-rajdhani">{t('subscription.proPlan')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('subscription.accountSlots', { count: accountSlots })}
                  </p>
                </div>
              </>
            ) : isTrialActive ? (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold font-rajdhani">{t('subscription.freeTrial')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('subscription.trialDaysLeft', { days: trialDaysRemaining })}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold font-rajdhani">{t('subscription.noSubscription')}</p>
                  <p className="text-sm text-muted-foreground">
                    {hasUsedTrial ? t('subscription.trialExpired') : t('subscription.startTrialPrompt')}
                  </p>
                </div>
              </>
            )}
          </div>

          {!hasAccess && (
            <Button 
              onClick={hasUsedTrial ? handleSubscribe : handleStartTrial}
              disabled={isCreatingCheckout || isStartingTrial}
              className="bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-gold/90 hover:to-yellow-500/90"
            >
              {hasUsedTrial ? t('subscription.subscribe') : t('subscription.startTrial')}
            </Button>
          )}

          {subscriptionStatus === 'active' && (
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10">
              {t('subscription.active')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
