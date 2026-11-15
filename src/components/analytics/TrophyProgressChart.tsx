import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { XAxis, YAxis, ReferenceLine, Area, AreaChart } from "recharts";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { ladderTrophyHistory } from "@/lib/battleTrophies";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { ChartEmptyState } from "@/components/ui/chart-empty-state";

interface TrophyProgressChartProps {
  battles: ClashRoyaleBattle[] | null;
  playerTag: string;
  currentTrophies?: number;
  bestTrophies?: number;
  isLoading?: boolean;
}

export function TrophyProgressChart({ 
  battles, 
  playerTag, 
  currentTrophies = 0,
  bestTrophies = 0,
  isLoading = false
}: TrophyProgressChartProps) {
  const { t, i18n } = useTranslation();
  const chartData = useMemo(() => {
    const dateFormat = new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return ladderTrophyHistory(playerTag, battles ?? []).map(({ battle, time, before, after }, index) => {
      const player = battle.team[0];
      const opponent = battle.opponent[0];
      return {
        index: index + 1,
        trophies: after,
        date: dateFormat.format(time),
        result: player.crowns > opponent.crowns ? 'win' : player.crowns < opponent.crowns ? 'loss' : 'draw',
        change: after - before,
        opponent: opponent.name,
        crowns: `${player.crowns} - ${opponent.crowns}`,
      };
    });
  }, [battles, playerTag, i18n.language]);

  const trophyChange = chartData.reduce((total, match) => total + match.change, 0);
  const trophyTrend = trophyChange > 0 ? 'up' : trophyChange < 0 ? 'down' : 'neutral';

  const chartConfig = {
    trophies: {
      label: t('dashboard.trophyProgress.trophies'),
      color: "hsl(var(--primary))",
    },
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case 'win': return t('dashboard.trophyProgress.win');
      case 'loss': return t('dashboard.trophyProgress.loss');
      case 'draw': return t('dashboard.trophyProgress.draw');
      default: return result;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-rajdhani">
            <Trophy className="h-5 w-5 text-primary" />
            {t('dashboard.trophyProgress.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton variant="area" height={200} />
        </CardContent>
      </Card>
    );
  }

  if (!battles || battles.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-rajdhani">
            <Trophy className="h-5 w-5 text-primary" />
            {t('dashboard.trophyProgress.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartEmptyState 
            icon={Trophy}
            variant="trend"
            height={200}
            title={t('dashboard.trophyProgress.noBattleData')}
            description={t('dashboard.trophyProgress.playToSee', 'Play battles to track your trophy progress')}
          />
        </CardContent>
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
              {t('dashboard.trophyProgress.title')}
            </CardTitle>
            <CardDescription>{t('dashboard.trophyProgress.lastBattles', { count: chartData.length })}</CardDescription>
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
                <span>{t('dashboard.trophyProgress.noChange')}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Current & Best Trophies */}
        <div className="flex gap-4 mt-2">
          <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">{t('dashboard.trophyProgress.current')}</p>
            <p className="font-rajdhani font-bold text-primary">{currentTrophies.toLocaleString(i18n.language)}</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs text-muted-foreground">{t('dashboard.trophyProgress.best')}</p>
            <p className="font-rajdhani font-bold text-accent">{bestTrophies.toLocaleString(i18n.language)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <ChartContainer config={chartConfig} className="h-[180px] md:h-[200px] min-h-[180px] w-full min-w-0">
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
                        <p className="font-semibold">{value} {t('dashboard.trophyProgress.trophies')}</p>
                        <p className="text-xs text-muted-foreground">{data.date}</p>
                        <p className={`text-xs font-medium ${
                          data.result === 'win' ? 'text-success' : 
                          data.result === 'loss' ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {getResultLabel(data.result)} ({data.change > 0 ? "+" : ""}{data.change}) {t('commonExtra.vs')} {data.opponent}
                        </p>
                        <p className="text-xs">{t('dashboard.trophyProgress.crowns')}: {data.crowns}</p>
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
                label={{ value: t('dashboard.trophyProgress.best'), position: 'right', fontSize: 10, fill: 'hsl(var(--accent))' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="trophies"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#trophyGradient)"
            dot={(props) => {
                const { cx, cy, payload, index } = props;
                const color = payload.result === 'win' 
                  ? 'hsl(var(--success))' 
                  : payload.result === 'loss' 
                    ? 'hsl(var(--destructive))' 
                    : 'hsl(var(--muted-foreground))';
                return (
                  <circle 
                    key={`dot-${index}`}
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
