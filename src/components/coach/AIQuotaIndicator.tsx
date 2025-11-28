import { useTranslation } from "react-i18next";
import { useAIQuota } from "@/hooks/useAIQuota";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIQuotaIndicatorProps {
  compact?: boolean;
}

export function AIQuotaIndicator({ compact = false }: AIQuotaIndicatorProps) {
  const { t } = useTranslation();
  const { requestsUsed, requestsRemaining, dailyLimit, quotaPercentage, isLoading } = useAIQuota();

  if (isLoading) return null;

  const isLow = requestsRemaining <= 3;
  const isExhausted = requestsRemaining === 0;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
        isExhausted ? "bg-destructive/20 text-destructive" :
        isLow ? "bg-yellow-500/20 text-yellow-600" :
        "bg-primary/10 text-primary"
      )}>
        <Sparkles className="w-3 h-3" />
        <span className="font-medium">{requestsRemaining}/{dailyLimit}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={cn(
            "w-4 h-4",
            isExhausted ? "text-destructive" :
            isLow ? "text-yellow-500" :
            "text-primary"
          )} />
          <span className="text-sm font-medium">{t('coach.aiQuota')}</span>
        </div>
        <span className={cn(
          "text-sm font-bold",
          isExhausted ? "text-destructive" :
          isLow ? "text-yellow-500" :
          "text-foreground"
        )}>
          {requestsRemaining}/{dailyLimit}
        </span>
      </div>
      
      <Progress 
        value={100 - quotaPercentage} 
        className={cn(
          "h-2",
          isExhausted && "[&>div]:bg-destructive",
          isLow && !isExhausted && "[&>div]:bg-yellow-500"
        )}
      />
      
      {isExhausted && (
        <p className="text-xs text-destructive">
          {t('coach.quotaExhausted')}
        </p>
      )}
      {isLow && !isExhausted && (
        <p className="text-xs text-yellow-600">
          {t('coach.quotaLow')}
        </p>
      )}
    </div>
  );
}
