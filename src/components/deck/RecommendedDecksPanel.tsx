import React, { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DataLoader } from "@/components/ui/data-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { useRecommendations, useRefreshRecommendations, DeckRecommendation } from "@/hooks/useRecommendations";
import { RecommendationHistoryCard } from "./RecommendationHistoryCard";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { FeedbackRating } from "@/components/feedback/FeedbackRating";
import { useFeedback } from "@/hooks/useFeedback";
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  Target, 
  Zap, 
  Trophy,
  Brain,
  TrendingUp,
  Clock,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendedDecksPanelProps {
  playerTag: string;
  trophies: number;
  onImportDeck?: (cards: string[]) => void;
  className?: string;
}

const RecommendationTypeBadge = memo(({ type }: { type: string }) => {
  const { t } = useTranslation();
  
  const config = {
    standard: { icon: Sparkles, color: "bg-primary/20 text-primary border-primary/30" },
    counter: { icon: Target, color: "bg-red-500/20 text-red-400 border-red-500/30" },
    strength: { icon: Zap, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
  };
  
  const { icon: Icon, color } = config[type as keyof typeof config] || config.standard;
  
  return (
    <Badge variant="outline" className={cn("gap-1", color)}>
      <Icon className="h-3 w-3" />
      {t(`recommendations.types.${type}`)}
    </Badge>
  );
});
RecommendationTypeBadge.displayName = "RecommendationTypeBadge";

// Simple card grid for string array
const SimpleCardGrid = memo(({ cards }: { cards: string[] }) => (
  <div className="grid grid-cols-4 gap-2">
    {cards.slice(0, 8).map((cardName, idx) => (
      <div 
        key={`${cardName}-${idx}`}
        className="aspect-[3/4] bg-card/80 rounded border border-border/50 flex items-center justify-center p-1"
      >
        <span className="text-[10px] text-center text-muted-foreground leading-tight">
          {cardName}
        </span>
      </div>
    ))}
  </div>
));
SimpleCardGrid.displayName = "SimpleCardGrid";

const RecommendationCard = memo(({ 
  recommendation, 
  onImport,
  index,
  playerTag
}: { 
  recommendation: DeckRecommendation; 
  onImport?: (cards: string[]) => void;
  index: number;
  playerTag: string;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const { submitFeedback } = useFeedback();
  
  const handleRating = (value: number) => {
    setFeedbackRating(value);
    setHasRated(true);
    submitFeedback({
      playerTag,
      feedbackType: "deck_recommendation",
      referenceId: recommendation.deckId,
      rating: value,
      helpful: value >= 4,
      context: {
        deckName: recommendation.deckName,
        archetype: recommendation.archetype,
        matchScore: recommendation.matchScore
      }
    });
  };
  
  return (
    <Card 
      className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {recommendation.deckName}
              <RecommendationTypeBadge type={recommendation.recommendationType} />
            </CardTitle>
            <CardDescription className="text-sm">
              {recommendation.archetype} • {recommendation.avgElixir?.toFixed(1)} Elixir • {recommendation.difficulty}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-primary font-semibold">
              <Trophy className="h-4 w-4" />
              <span>{recommendation.matchScore}%</span>
            </div>
            <span className="text-xs text-muted-foreground">{t("recommendations.matchScore")}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <SimpleCardGrid cards={recommendation.cards} />
        
        <p className="text-sm text-muted-foreground italic">
          "{recommendation.reason}"
        </p>
        
        {recommendation.aiExplanation && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  {t("recommendations.whyThisDeck")}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="bg-primary/5 rounded-lg p-3 text-sm border border-primary/10">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p>{recommendation.aiExplanation}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        <div className="flex gap-2 items-center">
          {onImport && (
            <Button 
              onClick={() => onImport(recommendation.cards)}
              className="flex-1"
              size="sm"
            >
              <Zap className="h-4 w-4 mr-1" />
              {t("recommendations.tryDeck")}
            </Button>
          )}
        </div>
        
        {/* Feedback rating */}
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {hasRated ? t("feedback.thankYou") : t("feedback.rateResponse")}
            </span>
            <FeedbackRating
              value={feedbackRating}
              onChange={handleRating}
              disabled={hasRated}
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
RecommendationCard.displayName = "RecommendationCard";

const PlayerProfileCard = memo(({ profile }: { 
  profile: { skillLevel: string; bestArchetypes: string[]; recentWinRate: number; totalBattles: number } 
}) => {
  const { t } = useTranslation();
  
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {t("recommendations.yourProfile")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">{t("recommendations.skillLevel")}</div>
            <div className="font-medium capitalize">{profile.skillLevel}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("recommendations.bestArchetypes")}</div>
            <div className="font-medium">{profile.bestArchetypes.slice(0, 2).join(", ") || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("recommendations.recentWinRate")}</div>
            <div className="font-medium">{profile.recentWinRate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("recommendations.battlesAnalyzed")}</div>
            <div className="font-medium">{profile.totalBattles}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
PlayerProfileCard.displayName = "PlayerProfileCard";

export const RecommendedDecksPanel = memo(({ 
  playerTag, 
  trophies, 
  onImportDeck,
  className 
}: RecommendedDecksPanelProps) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useRecommendations(playerTag, trophies);
  const { mutate: refresh, isPending: isRefreshing } = useRefreshRecommendations();
  
  const handleRefresh = () => {
    refresh({ playerTag, trophies });
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <DataLoader context="deck-analysis" customMessage={t("recommendations.refreshing")} />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data || data.recommendations?.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <EmptyState
            icon={Sparkles}
            title={t("recommendations.noRecommendations")}
            description={t("recommendations.noRecommendationsDesc")}
            action={{
              label: t("recommendations.refresh"),
              onClick: handleRefresh
            }}
          />
        </CardContent>
      </Card>
    );
  }
  
  const { recommendations, profile, aiEnhanced, fromCache } = data;
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("recommendations.title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("recommendations.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {fromCache && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {t("recommendations.fromCache")}
            </Badge>
          )}
          {aiEnhanced && (
            <Badge variant="default" className="gap-1 bg-primary/80">
              <Brain className="h-3 w-3" />
              {t("recommendations.aiEnhanced")}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
            {t("recommendations.refresh")}
          </Button>
        </div>
      </div>
      
      {profile && <PlayerProfileCard profile={profile} />}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={rec.deckId || index}
            recommendation={rec}
            onImport={onImportDeck}
            index={index}
            playerTag={playerTag}
          />
        ))}
      </div>
      
      {/* Recommendation History */}
      <RecommendationHistoryCard playerTag={playerTag} />
    </div>
  );
});

RecommendedDecksPanel.displayName = "RecommendedDecksPanel";
