import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRecommendationHistory } from "@/hooks/useRecommendations";
import { History, CheckCircle2, XCircle, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface RecommendationHistoryCardProps {
  playerTag: string;
  className?: string;
}

export const RecommendationHistoryCard = memo(({ playerTag, className }: RecommendationHistoryCardProps) => {
  const { t } = useTranslation();
  const { data: history, isLoading } = useRecommendationHistory(playerTag);

  if (isLoading || !history || history.length === 0) {
    return null;
  }

  // Calculate success metrics
  const adoptedRecs = history.filter(h => h.adopted);
  const successfulRecs = adoptedRecs.filter(h => 
    h.win_rate_after !== null && h.win_rate_before !== null && 
    (h.win_rate_after || 0) > (h.win_rate_before || 0)
  );
  
  const successRate = adoptedRecs.length > 0 
    ? Math.round((successfulRecs.length / adoptedRecs.length) * 100) 
    : 0;

  return (
    <Card className={cn("bg-card/50 border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          {t("recommendations.history")}
          {adoptedRecs.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {successRate}% {t("recommendations.successRate")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.slice(0, 5).map((rec) => {
          const isAdopted = rec.adopted;
          const winRateChange = rec.win_rate_after && rec.win_rate_before 
            ? rec.win_rate_after - rec.win_rate_before 
            : null;
          const isImproved = winRateChange !== null && winRateChange > 0;

          return (
            <div 
              key={rec.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg text-sm",
                "bg-background/50 border border-border/30"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isAdopted ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate font-medium">{rec.archetype}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {winRateChange !== null && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isImproved ? "text-green-500" : "text-red-500"
                  )}>
                    {isImproved ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{winRateChange > 0 ? '+' : ''}{winRateChange.toFixed(1)}%</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

RecommendationHistoryCard.displayName = "RecommendationHistoryCard";
