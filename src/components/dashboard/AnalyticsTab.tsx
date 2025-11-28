import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition } from "@/components/ui/loading-states";
import { DeckStatsDashboard } from "@/components/analytics/DeckStatsDashboard";
import { CardMasteryTracker } from "@/components/mastery/CardMasteryTracker";
import { AchievementDashboard } from "@/components/achievements/AchievementDashboard";

interface AnalyticsTabProps {
  playerTag: string;
}

export function AnalyticsTab({ playerTag }: AnalyticsTabProps) {
  const { t } = useTranslation();

  return (
    <PageTransition delay={100}>
      <Tabs defaultValue="deckstats" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deckstats">{t('dashboard.analytics.deckStats')}</TabsTrigger>
          <TabsTrigger value="mastery">{t('dashboard.analytics.cardMastery')}</TabsTrigger>
          <TabsTrigger value="achievements">{t('dashboard.analytics.achievements')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="deckstats" className="mt-6">
          <DeckStatsDashboard playerTag={playerTag} />
        </TabsContent>
        
        <TabsContent value="mastery" className="mt-6">
          <CardMasteryTracker playerTag={playerTag} />
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <AchievementDashboard playerTag={playerTag} />
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}
