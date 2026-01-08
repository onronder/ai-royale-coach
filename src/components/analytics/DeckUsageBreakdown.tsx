import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { ChartEmptyState } from "@/components/ui/chart-empty-state";
import { PieChart as PieChartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeckUsageStatRow } from "@/types/dashboard.types";

interface DeckUsageBreakdownProps {
  decks: DeckUsageStatRow[];
  isLoading?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  '#fbbf24',
  '#fb923c',
  '#f87171',
];

export function DeckUsageBreakdown({ decks, isLoading }: DeckUsageBreakdownProps) {
  const { t } = useTranslation();
  
  const chartData = (decks || [])
    .sort((a, b) => (b.battles_played || 0) - (a.battles_played || 0))
    .slice(0, 6)
    .map((deck, index) => {
      const deckCards = deck.deck_cards as string[] | null;
      const winRate = deck.battles_played ? (deck.battles_won || 0) / deck.battles_played : 0;
      return {
        name: t('analytics.deckNumber', { number: index + 1 }),
        value: deck.battles_played || 0,
        winRate: (winRate * 100).toFixed(1),
        cards: deckCards ? deckCards.slice(0, 3).join(', ') + '...' : '',
      };
    });

  const renderDeckListSkeleton = () => (
    <div className="space-y-4 flex-1 lg:w-1/2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card-secondary rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">{t('analytics.deckUsageDistribution')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="min-h-[300px] w-full lg:w-1/2">
            {isLoading ? (
              <ChartSkeleton variant="pie" height={300} />
            ) : chartData.length === 0 ? (
              <ChartEmptyState 
                variant="pie" 
                icon={PieChartIcon}
                height={300}
                title={t('analytics.noDecks', 'No deck data')}
                description={t('analytics.noDecksDesc', 'Your deck usage will appear here after playing')}
              />
            ) : (
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
            )}
          </div>

          {isLoading ? (
            renderDeckListSkeleton()
          ) : chartData.length === 0 ? null : (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}
