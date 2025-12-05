import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition } from "@/components/ui/loading-states";
import { DeckStatsDashboard } from "@/components/analytics/DeckStatsDashboard";
import { CardMasteryTracker } from "@/components/mastery/CardMasteryTracker";
import { AchievementDashboard } from "@/components/achievements/AchievementDashboard";
import { PredictionAccuracyDashboard } from "@/components/analytics/PredictionAccuracyDashboard";

interface AnalyticsTabProps {
  playerTag: string;
}

export function AnalyticsTab({ playerTag }: AnalyticsTabProps) {
  const { t } = useTranslation();

  return (
    <PageTransition delay={100}>
      <Tabs defaultValue="deckstats" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deckstats">{t('dashboard.analytics.deckStats')}</TabsTrigger>
          <TabsTrigger value="mastery">{t('dashboard.analytics.cardMastery')}</TabsTrigger>
          <TabsTrigger value="predictions">{t('dashboard.analytics.predictions')}</TabsTrigger>
          <TabsTrigger value="achievements">{t('dashboard.analytics.achievements')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="deckstats" className="mt-6">
          <DeckStatsDashboard playerTag={playerTag} />
        </TabsContent>
        
        <TabsContent value="mastery" className="mt-6">
          <CardMasteryTracker playerTag={playerTag} />
        </TabsContent>

        <TabsContent value="predictions" className="mt-6">
          <PredictionAccuracyDashboard playerTag={playerTag} />
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <AchievementDashboard playerTag={playerTag} />
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}
