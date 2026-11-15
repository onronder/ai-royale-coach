import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Crown, Swords, Users, Sparkles } from "lucide-react";
import { StatCard } from "@/components/stats/StatCard";
import { StatCardSkeleton, PageTransition } from "@/components/ui/loading-states";
import { useStatTooltips } from "@/components/ui/tooltip-helpers";
import { TrophyProgressChart } from "@/components/analytics/TrophyProgressChart";
import { AchievementBadgeWidget } from "@/components/achievements/AchievementBadgeWidget";
import { ClashRoyalePlayer, ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { cn } from "@/lib/utils";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";

import type { PlayerAnalysis } from "@/types/analysis.types";

interface OverviewTabProps {
  playerTag: string;
  player: ClashRoyalePlayer | null;
  battles: ClashRoyaleBattle[] | null;
  playerLoading: boolean;
  formattedWinRate: string;
  winRate: number;
  analysis: PlayerAnalysis | null;
  analysisLoading: boolean;
  analysisError: Error | null;
}

export function OverviewTab({
  playerTag,
  player,
  battles,
  playerLoading,
  formattedWinRate,
  winRate,
  analysis,
  analysisLoading,
  analysisError,
}: OverviewTabProps) {
  const { t } = useTranslation();
  const statTooltips = useStatTooltips();

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Stats Grid - Responsive columns */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {playerLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : player ? (
            <>
              <StatCard
                title={t('dashboard.currentTrophies')}
                value={player.trophies.toLocaleString()}
                icon={Trophy}
                description={`${t('dashboard.best')}: ${player.bestTrophies.toLocaleString()}`}
                trend="neutral"
                tooltip={statTooltips.trophies}
              />
              <StatCard
                title={t('dashboard.arena')}
                value={player.arena?.name || t('common.unknown')}
                icon={Crown}
                tooltip={statTooltips.arena}
              />
              <StatCard
                title={t('dashboard.winRate')}
                value={formattedWinRate}
                icon={Swords}
                description={battles?.length ? t('dashboard.trophyProgress.lastBattles', { count: battles.length }) : t('dashboard.noBattles')}
                trend={!battles?.length ? 'neutral' : winRate >= 50 ? 'up' : 'down'}
                tooltip={statTooltips.winRate}
              />
              <StatCard
                title={t('dashboard.clan')}
                value={player.clan?.name || t('dashboard.noClan')}
                icon={Users}
                description={player.clan ? undefined : t('dashboard.joinClan')}
              />
            </>
          ) : null}
        </div>

        {/* Trophy Progress Chart */}
        <TrophyProgressChart 
          battles={battles}
          playerTag={playerTag}
          currentTrophies={player?.trophies}
          bestTrophies={player?.bestTrophies}
        />

        {/* AI Analysis Card - Subscription Gated */}
        {/* Saved summary stays readable after access ends; new generation remains server-blocked. */}
        {(analysis as { read_only?: boolean } | null)?.read_only ? (
          <AIAnalysisCard analysis={analysis} analysisLoading={false} analysisError={null} />
        ) : (
          <SubscriptionGate feature={t('subscription.features.aiAnalysis')}>
            <AIAnalysisCard
              analysis={analysis}
              analysisLoading={analysisLoading}
              analysisError={analysisError}
            />
          </SubscriptionGate>
        )}

        {/* Achievement Badge Widget */}
        <AchievementBadgeWidget playerTag={playerTag} />
      </div>
    </PageTransition>
  );
}

interface AIAnalysisCardProps {
  analysis: PlayerAnalysis | null;
  analysisLoading: boolean;
  analysisError: Error | null;
}

function AIAnalysisCard({ analysis, analysisLoading, analysisError }: AIAnalysisCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-card border-2 border-royal/40 shadow-lg relative overflow-hidden">
      {/* Subtle corner accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-royal/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-royal/20 border border-royal/30">
            <Sparkles className="h-5 w-5 text-royal" />
          </div>
          <div>
            <CardTitle className="text-foreground">{t('dashboard.aiCoach.title')}</CardTitle>
            <CardDescription>
              {t('dashboard.aiCoach.subtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {analysisLoading ? (
          <div className="flex items-center gap-3 py-4">
            <Sparkles className="h-5 w-5 animate-pulse text-royal" />
            <span className="text-sm text-muted-foreground">{t('dashboard.aiCoach.generating')}</span>
          </div>
        ) : analysisError ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.aiCoach.error')}</p>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                {analysis.analysis.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**') && part.length > 4
                    ? <strong key={i}>{part.slice(2, -2)}</strong> : part)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3 pt-3 border-t border-border">
              <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-2xl font-bold text-success">{analysis.stats.winRate}%</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.winRate')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className={cn(
                  "text-2xl font-bold",
                  parseFloat(analysis.stats.avgTrophyChange) >= 0 ? "text-gold" : "text-destructive"
                )}>
                  {parseFloat(analysis.stats.avgTrophyChange) >= 0 ? '+' : ''}{analysis.stats.avgTrophyChange}
                </p>
                <p className="text-xs text-muted-foreground">{t('dashboard.avgTrophyChange')}</p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
