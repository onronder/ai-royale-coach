import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DeckTrendChartProps {
  stats: any[];
}

export function DeckTrendChart({ stats }: DeckTrendChartProps) {
  const { t } = useTranslation();
  
  // Group stats by date and calculate daily win rates
  const dailyStats = stats.reduce((acc, stat) => {
    const date = new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!acc[date]) {
      acc[date] = { date, totalWins: 0, totalBattles: 0, trophyChange: 0 };
    }
    
    acc[date].totalWins += stat.battles_won;
    acc[date].totalBattles += stat.battles_played;
    acc[date].trophyChange += stat.total_trophy_change;
    
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(dailyStats).map((day: any) => ({
    date: day.date,
    winRate: day.totalBattles > 0 ? (day.totalWins / day.totalBattles) * 100 : 0,
    trophyChange: day.trophyChange,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">{t('analytics.winRateTrends')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="winRate" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name={t('analytics.winRatePercent')}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="trophyChange" 
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              name={t('analytics.trophyChange')}
              dot={{ fill: 'hsl(var(--accent))' }}
            />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
