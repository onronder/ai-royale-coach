import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const chartData = data.map(d => ({
    name: d.archetype,
    winRate: Math.round(d.winRate),
    total: d.wins + d.losses
  }));

  const getColor = (winRate: number) => {
    if (winRate >= 60) return "hsl(var(--chart-1))";
    if (winRate >= 50) return "hsl(var(--chart-3))";
    return "hsl(var(--chart-5))";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Win Rate vs Archetypes</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              className="text-xs"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3">
                    <p className="font-semibold">{payload[0].payload.name}</p>
                    <p className="text-sm">Win Rate: {payload[0].value}%</p>
                    <p className="text-xs text-muted-foreground">
                      ({payload[0].payload.total} matches)
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="winRate" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.winRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
