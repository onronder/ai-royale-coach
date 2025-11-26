import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeckStats, useTrackDeckStats } from "@/hooks/useDeckStats";
import { AnalysisLoader } from "@/components/ui/analysis-loader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Trophy, Swords } from "lucide-react";
import { DeckTrendChart } from "./DeckTrendChart";
import { MostUsedCardsGrid } from "./MostUsedCardsGrid";
import { DeckUsageBreakdown } from "./DeckUsageBreakdown";
import { toast } from "sonner";

interface DeckStatsDashboardProps {
  playerTag: string;
}

export function DeckStatsDashboard({ playerTag }: DeckStatsDashboardProps) {
  const { data, isLoading, refetch } = useDeckStats(playerTag, 30);
  const trackStats = useTrackDeckStats();

  const handleSync = async () => {
    try {
      await trackStats(playerTag);
      toast.success("Deck stats synced successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to sync deck stats");
      console.error(error);
    }
  };

  if (isLoading) {
    return <AnalysisLoader message="Loading deck statistics..." icon="shield" variant="card" />;
  }

  const aggregated = data?.aggregated || [];
  const totalBattles = aggregated.reduce((sum, deck) => sum + deck.battles_played, 0);
  const totalWins = aggregated.reduce((sum, deck) => sum + deck.battles_won, 0);
  const overallWinRate = totalBattles > 0 ? (totalWins / totalBattles) * 100 : 0;
  const totalTrophyChange = aggregated.reduce((sum, deck) => sum + deck.total_trophy_change, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading text-foreground">Deck Statistics</h2>
          <p className="text-muted-foreground">Track your deck performance over time</p>
        </div>
        <Button onClick={handleSync} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Stats
        </Button>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Total Battles
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
              Win Rate
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
              Trophy Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalTrophyChange >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {totalTrophyChange > 0 ? '+' : ''}{totalTrophyChange}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Decks
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
          <TabsTrigger value="trends">Win Rate Trends</TabsTrigger>
          <TabsTrigger value="usage">Deck Usage</TabsTrigger>
          <TabsTrigger value="cards">Top Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <DeckTrendChart stats={data?.stats || []} />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <DeckUsageBreakdown decks={aggregated} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <MostUsedCardsGrid stats={data?.stats || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}