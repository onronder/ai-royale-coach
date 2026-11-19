import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCardMastery, useCalculateCardMastery } from "@/hooks/useCardMastery";
import { DataLoader } from "@/components/ui/data-loader";
import { CardMasteryCard } from "./CardMasteryCard";
import { RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { ProgressIndicator } from "@/components/ui/progress-indicator";

interface CardMasteryTrackerProps {
  playerTag: string;
}

export function CardMasteryTracker({ playerTag }: CardMasteryTrackerProps) {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<'level' | 'usage' | 'winrate'>('usage');
  const { data: cards, isLoading, error, refetch } = useCardMastery(playerTag);
  const calculateMastery = useCalculateCardMastery(playerTag);

  const handleSync = async () => {
    try {
      await calculateMastery.mutateAsync(playerTag);
      toast.success(t('cards.updateSuccess'));
      refetch();
    } catch (error) {
      toast.error(t('cards.updateFailed'));
      console.error(error);
    }
  };

  if (isLoading) {
    return <DataLoader context="mastery" variant="card" />;
  }

  if (error) return <div role="alert"><p>{t('common.error')}</p><Button onClick={()=>void refetch()}>{t('common.retry')}</Button></div>;

  const sortedCards = [...(cards || [])].sort((a, b) => {
    switch (sortBy) {
      case 'usage':
        return b.times_used - a.times_used;
      case 'winrate':
        return b.win_rate - a.win_rate;
      default:
        return b.mastery_level - a.mastery_level;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading text-foreground">{t('correctness.cardObservations')}</h2>
          <p className="text-muted-foreground">{t('correctness.noSkillInference')}</p>
        </div>
        <Button onClick={handleSync} variant="outline" size="sm" disabled={calculateMastery.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${calculateMastery.isPending ? 'animate-spin' : ''}`} />
          {t('mastery.updateMastery')}
        </Button>
      </div>

      {/* Progress Indicator */}
      {calculateMastery.progress && (
        <ProgressIndicator
          progress={calculateMastery.progress.progress}
          total={calculateMastery.progress.total}
          currentStep={calculateMastery.progress.current_step || undefined}
          status={calculateMastery.progress.status}
          startedAt={calculateMastery.progress.started_at}
          variant="default"
        />
      )}

      <p className="text-sm text-muted-foreground">{t('correctness.observationScope')}</p>

      {/* Sort Controls */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{t('mastery.sortBy')}:</span>
        <Select value={sortBy} onValueChange={(value: 'level' | 'usage' | 'winrate') => setSortBy(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usage">{t('mastery.mostUsed')}</SelectItem>
            <SelectItem value="winrate">{t('mastery.bestWinRate')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedCards.map((card) => (
          <CardMasteryCard key={card.id} card={card} playerTag={playerTag} />
        ))}
      </div>

      {(!cards || cards.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t('mastery.noData')}</p>
            <Button onClick={handleSync} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('mastery.calculateMastery')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}