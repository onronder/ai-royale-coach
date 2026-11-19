import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeckStats, useTrackDeckStats } from "@/hooks/useDeckStats";
import { DataLoader } from "@/components/ui/data-loader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Trophy, Swords } from "lucide-react";
import { DeckTrendChart } from "./DeckTrendChart";
import { MostUsedCardsGrid } from "./MostUsedCardsGrid";
import { DeckUsageBreakdown } from "./DeckUsageBreakdown";
import { EmptyState } from "@/components/ui/empty-state";
import type { AggregatedDeckStat } from "@/types/dashboard.types";

interface DeckStatsDashboardProps {
  playerTag: string;
}

export function DeckStatsDashboard({ playerTag }: DeckStatsDashboardProps) {
  const { t, i18n } = useTranslation();
  const [mode,setMode] = useState("all");
  const { data, isLoading, error, refetch } = useDeckStats(playerTag, 30);
  const { mutate: trackStats } = useTrackDeckStats();

  const handleSync = () => {
    trackStats(playerTag, {
      onSuccess: () => {
        refetch();
      }
    });
  };

  if (isLoading) {
    return <DataLoader context="analytics" variant="card" />;
  }

  if (error) return <div role="alert"><p>{t('common.error')}</p><Button onClick={()=>void refetch()}>{t('common.retry')}</Button></div>;
  const modes = [...new Set((data?.stats || []).map(s=>s.mode))];
  const activeMode = modes.includes(mode) ? mode : 'all';
  const aggregated = (data?.aggregated || []).filter(s=>activeMode==='all'||s.mode===activeMode);
  const filteredStats = (data?.stats || []).filter(s=>activeMode==='all'||s.mode===activeMode);
  const totalBattles = aggregated.reduce((sum, deck) => sum + deck.battles_played, 0);
  const totalWins = aggregated.reduce((sum, deck) => sum + deck.battles_won, 0);
  const overallWinRate = totalBattles > 0 ? (totalWins / totalBattles) * 100 : 0;
  const trophySamples = aggregated.reduce((sum,deck)=>sum+deck.trophy_samples,0);
  const totalTrophyChange = aggregated.reduce((sum, deck) => sum + deck.total_trophy_change, 0);

  if (!isLoading && totalBattles === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading text-foreground">{t('deckStats.title')}</h2>
            <p className="text-muted-foreground">{t('correctness.observationScope')}</p>
          </div>
          <Button onClick={handleSync} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('deckStats.syncStats')}
          </Button>
        </div>
        <EmptyState
          icon={TrendingUp}
          title={t('deckStats.noStats')}
          description={t('deckStats.noStatsDescription')}
          action={{
            label: t('deckStats.syncNow'),
            onClick: handleSync,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading text-foreground">{t('deckStats.title')}</h2>
          <p className="text-muted-foreground">{t('correctness.observationScope')}</p>
        </div>
        <Button onClick={handleSync} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('deckStats.syncStats')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2"><Button size="sm" variant={activeMode==='all'?'default':'outline'} onClick={()=>setMode('all')}>{t('common.all')}</Button>{modes.map(m=><Button key={m} size="sm" variant={activeMode===m?'default':'outline'} onClick={()=>setMode(m)}>{m}</Button>)}</div>
      <p className="text-xs text-muted-foreground">{t('correctness.sample',{count:totalBattles,wins:totalWins,losses:aggregated.reduce((sum,d)=>sum+d.battles_lost,0),draws:aggregated.reduce((sum,d)=>sum+d.battles_drawn,0)})}</p>
      {data?.stats[0]?.created_at && <p className="text-xs text-muted-foreground">{t('correctness.observedAt',{time:new Date(data.stats[0].created_at).toLocaleString(i18n.language)})}</p>}
      {/* Data Source Info */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
          {t('deckStats.realDataBadge')}
        </span>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Swords className="h-4 w-4" />
              {t('deckStats.totalBattles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalBattles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('deckStats.winRate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overallWinRate >= 50 ? 'text-accent' : 'text-destructive'}`}>
              {overallWinRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {t('deckStats.trophyChange')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalTrophyChange >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {trophySamples ? `${totalTrophyChange>0?'+':''}${totalTrophyChange}` : '—'} <small className="text-xs">n={trophySamples}</small>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('deckStats.activeDecks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{aggregated.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">{t('deckStats.winRateTrends')}</TabsTrigger>
          <TabsTrigger value="usage">{t('deckStats.deckUsage')}</TabsTrigger>
          <TabsTrigger value="cards">{t('deckStats.topCards')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <DeckTrendChart stats={filteredStats} />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <DeckUsageBreakdown decks={aggregated} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <MostUsedCardsGrid stats={filteredStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
