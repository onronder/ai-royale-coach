import { deckTrend } from '@/lib/deckTrend';
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { ChartEmptyState } from "@/components/ui/chart-empty-state";
import { TrendingUp } from "lucide-react";
import { DeckUsageStatRow } from "@/types/dashboard.types";

interface DeckTrendChartProps {
  stats: DeckUsageStatRow[];
  isLoading?: boolean;
}

export function DeckTrendChart({ stats, isLoading }: DeckTrendChartProps) {
  const { t, i18n } = useTranslation();
  
  const chartData = deckTrend(stats);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">{t('analytics.winRateTrends')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="min-h-[300px] w-full">
          {isLoading ? (
            <ChartSkeleton variant="line" height={300} />
          ) : chartData.length === 0 ? (
            <ChartEmptyState 
              variant="trend" 
              icon={TrendingUp}
              height={300}
              title={t('analytics.noTrendData', 'No trend data yet')}
              description={t('analytics.noTrendDataDesc', 'Play more battles to see your win rate trends')}
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={date => new Date(`${date}T00:00:00Z`).toLocaleDateString(i18n.language, { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis yAxisId="rate" domain={[0, 100]} unit="%"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis yAxisId="trophies" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line isAnimationActive={false}
                  type="monotone" 
                  dataKey="winRate" yAxisId="rate"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name={t('analytics.winRatePercent')}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line isAnimationActive={false}
                  type="monotone" 
                  dataKey="trophyChange" yAxisId="trophies"
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name={t('analytics.trophyChange')}
                  dot={{ fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
