import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeckUsageStatRow } from "@/types/dashboard.types";

interface MostUsedCardsGridProps {
  stats: DeckUsageStatRow[];
}

export function MostUsedCardsGrid({ stats }: MostUsedCardsGridProps) {
  const { t } = useTranslation();
  
  // Count card usage across all decks
  const cardUsage = new Map<string, { count: number; wins: number; battles: number }>();

  stats.forEach(stat => {
    const deckCards = stat.deck_cards as string[] | null;
    if (!deckCards) return;
    
    deckCards.forEach((cardName: string) => {
      if (!cardUsage.has(cardName)) {
        cardUsage.set(cardName, { count: 0, wins: 0, battles: 0 });
      }
      const usage = cardUsage.get(cardName)!;
      usage.count += stat.battles_played || 0;
      usage.wins += stat.battles_won || 0;
      usage.battles += stat.battles_played || 0;
    });
  });

  const topCards = Array.from(cardUsage.entries())
    .map(([name, data]) => ({
      name,
      usage: data.count,
      winRate: (data.wins / data.battles) * 100,
    }))
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">{t('analytics.mostUsedCards')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topCards.map((card) => (
            <div
              key={card.name}
              className="bg-card-secondary rounded-lg p-4 border border-border hover:border-primary/50 transition-all"
            >
              <div className="space-y-2">
                <div className="font-heading text-foreground">{card.name}</div>
                <div className="text-sm text-muted-foreground">
                  {t('analytics.usedTimes', { count: card.usage })}
                </div>
                <Badge 
                  variant={card.winRate >= 50 ? "default" : "destructive"}
                  className="w-full justify-center"
                >
                  {card.winRate.toFixed(1)}% {t('analytics.wr')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
