import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ArchetypeWinRate {
  archetype: string;
  wins: number;
  losses: number;
  winRate: number;
}

interface WinRateChartProps {
  data: ArchetypeWinRate[];
}

export function WinRateChart({ data }: WinRateChartProps) {
  const { t } = useTranslation();
  const chartData = data.map(d => ({
    name: d.archetype,
    winRate: Math.round(d.winRate),
    total: d.wins + d.losses,
    wins: d.wins,
    losses: d.losses
  }));

  const getColor = (winRate: number) => {
    if (winRate >= 60) return "hsl(var(--chart-1))"; // Green
    if (winRate >= 50) return "hsl(var(--chart-2))"; // Yellow
    return "hsl(var(--chart-3))"; // Red
  };

  const getGradient = (winRate: number) => {
    if (winRate >= 60) return "url(#successGradient)";
    if (winRate >= 50) return "url(#warningGradient)";
    return "url(#dangerGradient)";
  };

  const getTrendIcon = (winRate: number) => {
    if (winRate >= 60) return <TrendingUp className="w-4 h-4 text-chart-1" />;
    if (winRate >= 50) return <Minus className="w-4 h-4 text-chart-2" />;
    return <TrendingDown className="w-4 h-4 text-chart-3" />;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-gradient-primary bg-clip-text text-transparent">{t('winRateChart.title')}</span>
        </CardTitle>
        <CardDescription>{t('winRateChart.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="min-h-[350px] w-full">
          <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <defs>
              <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="dangerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
              vertical={false}
            />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              angle={-35}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(data.winRate)}
                      <p className="font-rajdhani font-bold text-base">{data.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {t('winRateChart.winRate')}: <span style={{ color: getColor(data.winRate) }}>{data.winRate}%</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.wins}W - {data.losses}L ({data.total} {t('winRateChart.matches')})
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar 
              dataKey="winRate" 
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getGradient(entry.winRate)}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    filter: `drop-shadow(0 4px 8px ${getColor(entry.winRate)}40)`
                  }}
                />
              ))}
              <LabelList 
                dataKey="winRate" 
                position="top" 
                formatter={(value: number) => `${value}%`}
                fill="hsl(var(--foreground))"
                fontSize={11}
                fontWeight="bold"
              />
            </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-chart-1 shadow-victory" />
            <span className="text-xs text-muted-foreground">{t('winRateChart.strong')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-chart-2" />
            <span className="text-xs text-muted-foreground">{t('winRateChart.even')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-chart-3 shadow-defeat" />
            <span className="text-xs text-muted-foreground">{t('winRateChart.weak')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
