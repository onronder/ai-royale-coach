import { getDateLocale } from "@/i18n/dateLocale";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecommendationHistory } from "@/hooks/useRecommendations";
import { History, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface RecommendationHistoryCardProps {
  playerTag: string;
  className?: string;
}

export const RecommendationHistoryCard = memo(({ playerTag, className }: RecommendationHistoryCardProps) => {
  const { t, i18n } = useTranslation();
  const { data: history, isLoading } = useRecommendationHistory(playerTag);

  if (isLoading || !history || history.length === 0) {
    return null;
  }

  return (
    <Card className={cn("bg-card/50 border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          {t("recommendations.history")}

        </CardTitle>
        <p className="text-xs text-muted-foreground">{t('correctness.recommendationScope')}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.slice(0, 5).map((rec) => {
          const isAdopted = rec.adopted;

          return (
            <div 
              key={rec.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg text-sm",
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
                <span className="text-xs text-muted-foreground">{rec.observation_mode ? `n=${rec.battles_after_adoption || 0}` : t('correctness.legacyData')}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true, locale: getDateLocale(i18n.language) })}
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
