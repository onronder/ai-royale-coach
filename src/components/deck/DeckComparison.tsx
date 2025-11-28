import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DeckData {
  name: string;
  cards: string[];
  avgElixir: number;
  synergy?: number;
  metaScore?: number;
}

interface DeckComparisonProps {
  deck1: DeckData;
  deck2: DeckData;
}

export function DeckComparison({ deck1, deck2 }: DeckComparisonProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const getComparison = (val1: number, val2: number) => {
    const diff = val1 - val2;
    if (Math.abs(diff) < 2) return { icon: Minus, color: "text-muted-foreground", text: t('deckComparison.similar') };
    if (diff > 0) return { icon: TrendingUp, color: "text-success", text: `+${diff.toFixed(1)}` };
    return { icon: TrendingDown, color: "text-destructive", text: diff.toFixed(1) };
  };

  const stats = [
    { label: t('deckComparison.avgElixir'), val1: deck1.avgElixir, val2: deck2.avgElixir, max: 5 },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('deckComparison.title')}
            <Badge variant="secondary">{t('deckComparison.headToHead')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deck Names */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <h3 className="font-heading text-lg text-foreground">{deck1.name}</h3>
              <p className="text-sm text-muted-foreground">{deck1.cards.length} {t('deckComparison.cards')}</p>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-heading text-lg text-foreground">{deck2.name}</h3>
              <p className="text-sm text-muted-foreground">{deck2.cards.length} {t('deckComparison.cards')}</p>
            </div>
          </div>

          <Separator />

          {/* Stats Comparison */}
          <div className="space-y-4">
            {stats.map((stat) => {
              const comp = getComparison(stat.val1, stat.val2);
              const Icon = comp.icon;
              
              return (
                <div key={stat.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stat.label}</span>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${comp.color}`} />
                      <span className={comp.color}>{comp.text}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Progress value={(stat.val1 / stat.max) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{stat.val1.toFixed(1)}</p>
                    </div>
                    <div>
                      <Progress value={(stat.val2 / stat.max) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{stat.val2.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Matchup Analysis Disclaimer */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
            <h4 className="font-heading text-sm text-foreground">{t('deckComparison.matchupAnalysis')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('deckComparison.matchupDisclaimer')}
            </p>
          </div>

          {/* Card-by-Card Breakdown */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? t('deckComparison.hideBreakdown') : t('deckComparison.showBreakdown')}
          </Button>

          {showDetails && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <h5 className="font-heading text-sm text-muted-foreground">{t('deckComparison.deck1Cards')}</h5>
                <div className="grid grid-cols-2 gap-2">
                  {deck1.cards.map((card, idx) => (
                    <div key={idx} className="bg-muted rounded p-2 text-xs text-center">
                      {card}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h5 className="font-heading text-sm text-muted-foreground">{t('deckComparison.deck2Cards')}</h5>
                <div className="grid grid-cols-2 gap-2">
                  {deck2.cards.map((card, idx) => (
                    <div key={idx} className="bg-muted rounded p-2 text-xs text-center">
                      {card}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
