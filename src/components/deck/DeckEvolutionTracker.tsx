import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Undo2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DeckStats {
  avgElixir: number;
  synergy?: number;
  metaScore?: number;
}

interface SwapHistory {
  oldCard: string;
  newCard: string;
  beforeStats: DeckStats;
  afterStats: DeckStats;
  timestamp: number;
}

interface DeckEvolutionTrackerProps {
  currentDeck: string[];
  onSwap: (oldCard: string, newCard: string) => void;
  onUndo: () => void;
}

export function DeckEvolutionTracker({
  currentDeck,
  onSwap,
  onUndo,
}: DeckEvolutionTrackerProps) {
  const { t } = useTranslation();
  const [swapHistory, setSwapHistory] = useState<SwapHistory[]>([]);
  const [trySwapMode, setTrySwapMode] = useState(false);

  const getDiff = (before: number, after: number) => {
    const diff = after - before;
    if (Math.abs(diff) < 0.5) {
      return { icon: Minus, color: "text-muted-foreground", text: t('deckEvolution.noChange') };
    }
    if (diff > 0) {
      return { icon: TrendingUp, color: "text-success", text: `+${diff.toFixed(1)}` };
    }
    return { icon: TrendingDown, color: "text-destructive", text: diff.toFixed(1) };
  };

  const handleSwap = (oldCard: string, newCard: string, stats: { before: DeckStats; after: DeckStats }) => {
    const swap: SwapHistory = {
      oldCard,
      newCard,
      beforeStats: stats.before,
      afterStats: stats.after,
      timestamp: Date.now(),
    };
    setSwapHistory((prev) => [...prev, swap]);
    onSwap(oldCard, newCard);
  };

  const handleUndo = () => {
    if (swapHistory.length > 0) {
      setSwapHistory((prev) => prev.slice(0, -1));
      onUndo();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('deckEvolution.title')}</span>
            <div className="flex gap-2">
              {swapHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleUndo} className="gap-2">
                  <Undo2 className="h-4 w-4" />
                  {t('deckEvolution.undoLast')}
                </Button>
              )}
              <Badge variant={trySwapMode ? "default" : "secondary"}>
                {trySwapMode ? t('deckEvolution.tryModeActive') : t('deckEvolution.liveMode')}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {swapHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('deckEvolution.makeSwaps')}</p>
              <p className="text-sm mt-2">{t('deckEvolution.statsAppear')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {swapHistory.map((swap, idx) => {
                const synergyDiff = getDiff(
                  swap.beforeStats.synergy || 0,
                  swap.afterStats.synergy || 0
                );
                const metaDiff = getDiff(
                  swap.beforeStats.metaScore || 0,
                  swap.afterStats.metaScore || 0
                );
                const elixirDiff = getDiff(
                  swap.beforeStats.avgElixir,
                  swap.afterStats.avgElixir
                );

                const SynergyIcon = synergyDiff.icon;
                const MetaIcon = metaDiff.icon;
                const ElixirIcon = elixirDiff.icon;

                return (
                  <Card key={idx} className="bg-accent/5">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{swap.oldCard}</Badge>
                          <ArrowRight className="h-4 w-4 text-primary" />
                          <Badge variant="default">{swap.newCard}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(swap.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">{t('deckEvolution.synergy')}</p>
                          <div className="flex items-center gap-2">
                            <SynergyIcon className={`h-4 w-4 ${synergyDiff.color}`} />
                            <span className={synergyDiff.color}>{synergyDiff.text}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">{t('deckEvolution.metaScore')}</p>
                          <div className="flex items-center gap-2">
                            <MetaIcon className={`h-4 w-4 ${metaDiff.color}`} />
                            <span className={metaDiff.color}>{metaDiff.text}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs">{t('deckEvolution.avgElixir')}</p>
                          <div className="flex items-center gap-2">
                            <ElixirIcon className={`h-4 w-4 ${elixirDiff.color}`} />
                            <span className={elixirDiff.color}>{elixirDiff.text}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
