import { useTranslation } from "react-i18next";
import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureAccess, FeatureName } from "@/hooks/useFeatureAccess";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeatureUsageIndicatorProps {
  feature: FeatureName;
  playerTag: string;
  variant?: 'badge' | 'inline' | 'tooltip';
  className?: string;
}

export function FeatureUsageIndicator({
  feature,
  playerTag,
  variant = 'badge',
  className,
}: FeatureUsageIndicatorProps) {
  const { t } = useTranslation();
  const {
    isLoading,
    accessResult,
    usageCount,
    dailyLimit,
    remainingUses,
  } = useFeatureAccess(feature, playerTag);

  if (isLoading) {
    return null;
  }

  const reason = accessResult?.reason;

  // Pro users - show unlimited badge
  if (reason === 'pro') {
    if (variant === 'tooltip') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                "bg-gradient-gold/20 text-gold text-xs font-medium",
                className
              )}>
                <Crown className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('subscription.unlimitedAccess')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-gradient-gold/20 text-gold text-xs font-medium",
        className
      )}>
        <Crown className="h-3 w-3" />
        <span>{t('subscription.unlimited')}</span>
      </div>
    );
  }

  // Trial users
  if (reason === 'trial') {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-primary/20 text-primary text-xs font-medium",
        className
      )}>
        <Sparkles className="h-3 w-3" />
        <span>{t('subscription.trial')}</span>
      </div>
    );
  }

  // Free users with daily quota
  const isLow = remainingUses <= 1;
  const isExhausted = remainingUses === 0;

  if (variant === 'tooltip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              isExhausted 
                ? "bg-destructive/20 text-destructive"
                : isLow 
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground",
              className
            )}>
              <span>{usageCount}/{dailyLimit}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isExhausted 
                ? t('subscription.quotaExhaustedTooltip')
                : t('subscription.usesToday', { remaining: remainingUses })
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      isExhausted 
        ? "bg-destructive/20 text-destructive"
        : isLow 
          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          : "bg-muted text-muted-foreground",
      className
    )}>
      <span>{usageCount}/{dailyLimit}</span>
      {variant === 'inline' && (
        <span className="text-muted-foreground">{t('common.today')}</span>
      )}
    </div>
  );
}
