import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface DeckUsageBreakdownProps {
  decks: any[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  '#fbbf24',
  '#fb923c',
  '#f87171',
];

export function DeckUsageBreakdown({ decks }: DeckUsageBreakdownProps) {
  const { t } = useTranslation();
  
  const chartData = decks
    .sort((a, b) => b.battles_played - a.battles_played)
    .slice(0, 6)
    .map((deck, index) => ({
      name: t('analytics.deckNumber', { number: index + 1 }),
      value: deck.battles_played,
      winRate: (deck.win_rate * 100).toFixed(1),
      cards: deck.deck_cards.slice(0, 3).join(', ') + '...',
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">{t('analytics.deckUsageDistribution')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="min-h-[300px] w-full lg:w-1/2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4 flex-1 lg:w-1/2">
            {chartData.map((deck, index) => (
              <div
                key={index}
                className="bg-card-secondary rounded-lg p-4 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-heading text-foreground">{deck.name}</div>
                  <div className="text-sm text-accent font-semibold">
                    {deck.winRate}% {t('analytics.wr')}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{deck.cards}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('analytics.battlesCount', { count: deck.value })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
