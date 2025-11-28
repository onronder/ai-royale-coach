import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CardImage } from "@/components/cards/CardImage";
import { DeckSelector } from "./DeckSelector";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Zap, ChevronDown, ChevronUp, Gauge, Flame, Crown } from "lucide-react";

interface SavedDeck {
  id: string;
  name: string;
  cards: ClashRoyaleCard[];
  avg_elixir?: number;
  archetype?: string;
}

interface DeckComparisonProps {
  builderDeck: ClashRoyaleCard[];
  savedDecks: SavedDeck[];
  currentDeck: ClashRoyaleCard[] | null;
}

export function DeckComparison({ builderDeck, savedDecks, currentDeck }: DeckComparisonProps) {
  const { t } = useTranslation();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [comparisonCards, setComparisonCards] = useState<ClashRoyaleCard[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleSelectDeck = (deckId: string, cards: ClashRoyaleCard[]) => {
    setSelectedDeckId(deckId);
    setComparisonCards(cards);
  };

  const calculateAvgElixir = (cards: ClashRoyaleCard[]) => {
    if (cards.length === 0) return 0;
    return cards.reduce((sum, card) => sum + (card.elixirCost || 0), 0) / cards.length;
  };

  // Count cards by elixir cost ranges for comparison
  const getElixirBreakdown = (cards: ClashRoyaleCard[]) => {
    return {
      lowCost: cards.filter(c => (c.elixirCost || 0) <= 2).length,
      midCost: cards.filter(c => (c.elixirCost || 0) >= 3 && (c.elixirCost || 0) <= 4).length,
      highCost: cards.filter(c => (c.elixirCost || 0) >= 5).length
    };
  };

  const getComparison = (val1: number, val2: number, lowerBetter = false) => {
    const diff = val1 - val2;
    const threshold = 0.2;
    
    if (Math.abs(diff) < threshold) {
      return { icon: Minus, color: "text-muted-foreground", text: t('deckComparison.similar') };
    }
    
    const isPositive = lowerBetter ? diff < 0 : diff > 0;
    if (isPositive) {
      return { icon: TrendingUp, color: "text-success", text: `+${Math.abs(diff).toFixed(1)}` };
    }
    return { icon: TrendingDown, color: "text-destructive", text: `-${Math.abs(diff).toFixed(1)}` };
  };

  const deck1Elixir = calculateAvgElixir(builderDeck);
  const deck2Elixir = calculateAvgElixir(comparisonCards);
  const deck1Breakdown = getElixirBreakdown(builderDeck);
  const deck2Breakdown = getElixirBreakdown(comparisonCards);
  
  const elixirComparison = getComparison(deck1Elixir, deck2Elixir, true);

  const getSelectedDeckName = () => {
    if (selectedDeckId === "current") return t('deckComparison.currentInGameDeck');
    const deck = savedDecks.find(d => d.id === selectedDeckId);
    return deck?.name || t('deckComparison.selectDeckB');
  };

  return (
    <div className="space-y-4">
      {/* Deck Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('deckComparison.selectComparison')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeckSelector
            savedDecks={savedDecks}
            currentDeck={currentDeck}
            selectedDeckId={selectedDeckId}
            onSelectDeck={handleSelectDeck}
          />
        </CardContent>
      </Card>

      {/* Comparison View */}
      {comparisonCards.length === 8 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('deckComparison.title')}
              <Badge variant="secondary">{t('deckComparison.headToHead')}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deck Headers */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <h3 className="font-heading text-lg text-foreground">{t('deckComparison.deckA')}</h3>
                <p className="text-sm text-muted-foreground">{t('deckComparison.yourBuild')}</p>
              </div>
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-heading text-lg text-foreground">{t('deckComparison.deckB')}</h3>
                <p className="text-sm text-muted-foreground">{getSelectedDeckName()}</p>
              </div>
            </div>

            {/* Card Preview - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 gap-1">
                {builderDeck.map((card, idx) => (
                  <CardImage key={idx} card={card} size="sm" showElixir />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {comparisonCards.map((card, idx) => (
                  <CardImage key={idx} card={card} size="sm" showElixir />
                ))}
              </div>
            </div>

            <Separator />

            {/* Stats Comparison */}
            <div className="space-y-4">
              {/* Average Elixir */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="font-medium">{t('deckComparison.avgElixir')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <elixirComparison.icon className={`h-4 w-4 ${elixirComparison.color}`} />
                    <span className={`text-sm ${elixirComparison.color}`}>{elixirComparison.text}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-2xl font-bold text-foreground">{deck1Elixir.toFixed(1)}</span>
                  </div>
                  <div className="text-muted-foreground">vs</div>
                  <div>
                    <span className="text-2xl font-bold text-foreground">{deck2Elixir.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Elixir Cost Distribution */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <Gauge className="h-4 w-4 mx-auto mb-1 text-success" />
                  <p className="text-xs text-muted-foreground">{t('deckComparison.lowCost')}</p>
                  <div className="flex justify-around mt-1">
                    <span className="font-bold">{deck1Breakdown.lowCost}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-bold">{deck2Breakdown.lowCost}</span>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <Flame className="h-4 w-4 mx-auto mb-1 text-warning" />
                  <p className="text-xs text-muted-foreground">{t('deckComparison.midCost')}</p>
                  <div className="flex justify-around mt-1">
                    <span className="font-bold">{deck1Breakdown.midCost}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-bold">{deck2Breakdown.midCost}</span>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <Crown className="h-4 w-4 mx-auto mb-1 text-destructive" />
                  <p className="text-xs text-muted-foreground">{t('deckComparison.highCost')}</p>
                  <div className="flex justify-around mt-1">
                    <span className="font-bold">{deck1Breakdown.highCost}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-bold">{deck2Breakdown.highCost}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Detailed Breakdown Toggle */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              {showBreakdown ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  {t('deckComparison.hideBreakdown')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  {t('deckComparison.showBreakdown')}
                </>
              )}
            </Button>

            {showBreakdown && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <h5 className="font-heading text-sm text-muted-foreground">{t('deckComparison.deck1Cards')}</h5>
                  <div className="space-y-1">
                    {builderDeck.map((card, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded p-2 text-sm">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">{card.elixirCost}</span>
                        <span className="flex-1">{card.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h5 className="font-heading text-sm text-muted-foreground">{t('deckComparison.deck2Cards')}</h5>
                  <div className="space-y-1">
                    {comparisonCards.map((card, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded p-2 text-sm">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">{card.elixirCost}</span>
                        <span className="flex-1">{card.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
              <h4 className="font-heading text-sm text-foreground">{t('deckComparison.note')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('deckComparison.noteDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {comparisonCards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg mb-2">{t('deckComparison.selectToCompare')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('deckComparison.selectToCompareDesc')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
