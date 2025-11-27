import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { format } from "date-fns";
import { parseClashRoyaleDate } from "@/lib/utils";

function formatBattleDate(battleTime: string): string {
  try {
    const date = parseClashRoyaleDate(battleTime);
    return format(date, 'MMM d, HH:mm');
  } catch {
    return 'Unknown';
  }
}

interface TrophyProgressChartProps {
  battles: ClashRoyaleBattle[] | null;
  playerTag: string;
  currentTrophies?: number;
  bestTrophies?: number;
}

export function TrophyProgressChart({ 
  battles, 
  playerTag, 
  currentTrophies = 0,
  bestTrophies = 0 
}: TrophyProgressChartProps) {
  const chartData = useMemo(() => {
    if (!battles || battles.length === 0) return [];

    const normalizedTag = playerTag?.startsWith('#') ? playerTag : `#${playerTag}`;
    
    // Sort battles by time (oldest first)
    const sortedBattles = [...battles].sort(
      (a, b) => parseClashRoyaleDate(a.battleTime).getTime() - parseClashRoyaleDate(b.battleTime).getTime()
    );

    // Calculate trophy progression based on battle results
    let runningTrophies = currentTrophies;
    
    // Work backwards from current trophies
    const trophyChanges: { battle: ClashRoyaleBattle; change: number }[] = [];
    
    for (let i = sortedBattles.length - 1; i >= 0; i--) {
      const battle = sortedBattles[i];
      const playerTeam = battle.team.find(p => p.tag === normalizedTag);
      const opponentCrowns = battle.opponent[0]?.crowns || 0;
      const playerCrowns = playerTeam?.crowns || 0;
      
      // Estimate trophy change based on battle type and result
      let change = 0;
      if (battle.type === 'pathOfLegend' || battle.type === 'ranked') {
        if (playerCrowns > opponentCrowns) change = 30;
        else if (playerCrowns < opponentCrowns) change = -30;
      } else if (battle.type === 'PvP') {
        if (playerCrowns > opponentCrowns) change = 25;
        else if (playerCrowns < opponentCrowns) change = -25;
      }
      
      trophyChanges.unshift({ battle, change });
    }

    // Now build the chart data forward
    let trophies = currentTrophies;
    // First, subtract all changes to get starting point
    for (const { change } of trophyChanges) {
      trophies -= change;
    }

    const data = trophyChanges.map(({ battle, change }, index) => {
      trophies += change;
      const playerTeam = battle.team.find(p => p.tag === normalizedTag);
      const opponentCrowns = battle.opponent[0]?.crowns || 0;
      const playerCrowns = playerTeam?.crowns || 0;
      const isWin = playerCrowns > opponentCrowns;
      const isDraw = playerCrowns === opponentCrowns;

      return {
        index: index + 1,
        trophies: Math.max(0, trophies),
        date: formatBattleDate(battle.battleTime),
        result: isWin ? 'Win' : isDraw ? 'Draw' : 'Loss',
        change: change > 0 ? `+${change}` : change === 0 ? '0' : `${change}`,
        opponent: battle.opponent[0]?.name || 'Unknown',
        crowns: `${playerCrowns} - ${opponentCrowns}`,
      };
    });

    return data;
  }, [battles, playerTag, currentTrophies]);

  const trophyTrend = useMemo(() => {
    if (chartData.length < 2) return 'neutral';
    const first = chartData[0]?.trophies || 0;
    const last = chartData[chartData.length - 1]?.trophies || 0;
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'neutral';
  }, [chartData]);

  const trophyChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0]?.trophies || 0;
    const last = chartData[chartData.length - 1]?.trophies || 0;
    return last - first;
  }, [chartData]);

  const chartConfig = {
    trophies: {
      label: "Trophies",
      color: "hsl(var(--primary))",
    },
  };

  if (!battles || battles.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-rajdhani">
            <Trophy className="h-5 w-5 text-primary" />
            Trophy Progress
          </CardTitle>
          <CardDescription>No battle data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-rajdhani">
              <Trophy className="h-5 w-5 text-primary" />
              Trophy Progress
            </CardTitle>
            <CardDescription>Last {chartData.length} battles</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trophyTrend === 'up' && (
              <div className="flex items-center gap-1 text-success text-sm font-semibold">
                <TrendingUp className="h-4 w-4" />
                <span>+{trophyChange}</span>
              </div>
            )}
            {trophyTrend === 'down' && (
              <div className="flex items-center gap-1 text-destructive text-sm font-semibold">
                <TrendingDown className="h-4 w-4" />
                <span>{trophyChange}</span>
              </div>
            )}
            {trophyTrend === 'neutral' && (
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Minus className="h-4 w-4" />
                <span>No change</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Current & Best Trophies */}
        <div className="flex gap-4 mt-2">
          <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-rajdhani font-bold text-primary">{currentTrophies.toLocaleString()}</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs text-muted-foreground">Best</p>
            <p className="font-rajdhani font-bold text-accent">{bestTrophies.toLocaleString()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trophyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="index" 
              tickLine={false} 
              axisLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={['dataMin - 50', 'dataMax + 50']}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              width={40}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name, props) => {
                    const data = props.payload;
                    return (
                      <div className="space-y-1">
                        <p className="font-semibold">{value} trophies</p>
                        <p className="text-xs text-muted-foreground">{data.date}</p>
                        <p className={`text-xs font-medium ${
                          data.result === 'Win' ? 'text-success' : 
                          data.result === 'Loss' ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {data.result} ({data.change}) vs {data.opponent}
                        </p>
                        <p className="text-xs">Crowns: {data.crowns}</p>
                      </div>
                    );
                  }}
                />
              }
            />
            {bestTrophies > 0 && (
              <ReferenceLine 
                y={bestTrophies} 
                stroke="hsl(var(--accent))" 
                strokeDasharray="3 3"
                label={{ value: 'Best', position: 'right', fontSize: 10, fill: 'hsl(var(--accent))' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="trophies"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#trophyGradient)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const color = payload.result === 'Win' 
                  ? 'hsl(var(--success))' 
                  : payload.result === 'Loss' 
                    ? 'hsl(var(--destructive))' 
                    : 'hsl(var(--muted-foreground))';
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={3} 
                    fill={color} 
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={{ r: 5, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
