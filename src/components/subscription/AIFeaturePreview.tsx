import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "./PricingModal";
import { cn } from "@/lib/utils";

interface AIFeaturePreviewProps {
  children: ReactNode;
  previewContent?: ReactNode;
  featureName?: string;
  className?: string;
}

export function AIFeaturePreview({ 
  children, 
  previewContent,
  featureName,
  className 
}: AIFeaturePreviewProps) {
  const { t } = useTranslation();
  const [showPricing, setShowPricing] = useState(false);
  const { hasAccess, hasUsedTrial, isLoading } = useSubscription();

  // If loading or has access, render children normally
  if (isLoading || hasAccess) {
    return <>{children}</>;
  }

  // If user has used trial (trial expired), show blurred preview
  if (hasUsedTrial && previewContent) {
    return (
      <>
        <div className={cn("relative", className)}>
          {/* Blurred preview content */}
          <div className="blur-[6px] pointer-events-none select-none">
            {previewContent}
          </div>
          
          {/* Overlay with upgrade prompt */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/95 via-background/80 to-background/60 backdrop-blur-[2px]">
            <div className="text-center p-6 max-w-sm">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-warning/20 flex items-center justify-center mb-4 border border-gold/30">
                <Lock className="h-7 w-7 text-gold" />
              </div>
              
              <h3 className="font-heading text-lg text-foreground mb-2">
                {t('subscription.previewTitle', 'Preview of AI Analysis')}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                {t('subscription.trialExpiredPreview', 'Your trial has ended. Subscribe to see the full analysis.')}
              </p>
              
              <Button
                onClick={() => setShowPricing(true)}
                className="bg-gradient-to-r from-gold to-warning text-warning-foreground hover:opacity-90 gap-2"
              >
                <Crown className="h-4 w-4" />
                {t('subscription.seeFull', 'See Full Analysis')}
              </Button>
            </div>
          </div>
        </div>
        <PricingModal open={showPricing} onOpenChange={setShowPricing} />
      </>
    );
  }

  // User never had trial - show standard subscription gate
  return (
    <>
      <div className={cn("relative", className)}>
        <div className="flex flex-col items-center justify-center p-8 text-center border border-border/50 rounded-lg bg-card/50">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 border border-primary/30">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          
          <h3 className="font-heading text-lg text-foreground mb-2">
            {featureName 
              ? t('subscription.featureRequiresPro', '{{feature}} requires AI Royale Pro', { feature: featureName })
              : t('subscription.proFeature', 'Pro Feature')
            }
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            {t('subscription.premiumDescription', 'Get full access to AI coaching, deck analysis, and personalized recommendations.')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPricing(true)}
              className="gap-2"
            >
              {t('subscription.startFreeTrial', 'Start 3-Day Free Trial')}
            </Button>
            <Button
              onClick={() => setShowPricing(true)}
              className="bg-gradient-to-r from-gold to-warning text-warning-foreground hover:opacity-90 gap-2"
            >
              <Crown className="h-4 w-4" />
              {t('subscription.subscribePro', 'Subscribe to Pro')}
            </Button>
          </div>
        </div>
      </div>
      <PricingModal open={showPricing} onOpenChange={setShowPricing} />
    </>
  );
}
