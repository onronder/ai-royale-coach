import { observeBattles } from '../../../supabase/functions/_shared/battle-observation';
import { gameLabel } from '@/i18n/gameLabel';
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
  const { t, i18n } = useTranslation();
  const sample = observeBattles(battles, playerTag);
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
                value={player.trophies.toLocaleString(i18n.language)}
                icon={Trophy}
                description={`${t('dashboard.best')}: ${player.bestTrophies.toLocaleString(i18n.language)}`}
                trend="neutral"
                tooltip={statTooltips.trophies}
              />
              <StatCard
                title={t('dashboard.arena')}
                value={player.arena?.name ? gameLabel(player.arena.name, t) : t('common.unknown')}
                icon={Crown}
                tooltip={statTooltips.arena}
              />
              <StatCard
                title={t('dashboard.winRate')}
                value={formattedWinRate}
                icon={Swords}
                description={t('correctness.sample', { count: sample.total, wins: sample.wins, losses: sample.losses, draws: sample.draws })}
                trend={!sample.total ? 'neutral' : winRate >= 50 ? 'up' : 'down'}
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

        {sample.excluded > 0 && <p className="text-xs text-muted-foreground">{t('correctness.excluded', { count: sample.excluded })}</p>}

        {/* Trophy Progress Chart */}
        <TrophyProgressChart 
          battles={battles}
          playerTag={playerTag}
          currentTrophies={player?.trophies}
          bestTrophies={player?.bestTrophies}
        />

        {/* AI Analysis Card - Subscription Gated */}
        {/* Saved summary stays readable after access ends; new generation remains server-blocked. */}
        {analysis?.read_only ? (
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
  const { t, i18n } = useTranslation();

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
            {analysis.read_only && <p className="text-xs text-muted-foreground">{t('correctness.savedSummary', { date: analysis.analyzed_at ? new Date(analysis.analyzed_at).toLocaleString(i18n.language) : t('common.unknown') })}</p>}
            <div className="prose prose-sm max-w-none">
              {analysis.read_only && analysis.language && analysis.language !== i18n.resolvedLanguage &&
                <p className="mb-2 text-xs text-muted-foreground">{t('coachingHistory.language', { language: new Intl.DisplayNames([i18n.language], { type: 'language' }).of(analysis.language) })}</p>}
              <p lang={analysis.language} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                {analysis.analysis.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
                  part.startsWith('**') && part.endsWith('**') && part.length > 4
                    ? <strong key={i}>{part.slice(2, -2)}</strong> : part)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3 pt-3 border-t border-border">
              <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-2xl font-bold text-success">{Number.isFinite(Number(analysis.stats.winRate)) ? `${analysis.stats.winRate}%` : '—'}</p>
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
