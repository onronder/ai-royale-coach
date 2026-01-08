import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { CardImage } from "@/components/cards/CardImage";
import { DeckSelector } from "./DeckSelector";
import { PredictionAccuracyChart } from "./PredictionAccuracyChart";
import { AIQuotaIndicator } from "@/components/coach/AIQuotaIndicator";
import { useAIQuota } from "@/hooks/useAIQuota";
import { usePredictionHistory } from "@/hooks/usePredictionHistory";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "@/components/subscription/PricingModal";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowRight, TrendingUp, TrendingDown, Minus, Zap, ChevronDown, ChevronUp, 
  Gauge, Flame, Crown, Sparkles, Loader2, Shield, Swords, Info, History, Database, Lock
} from "lucide-react";

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

interface KeyMatchup {
  deckACard: string;
  deckBCard: string;
  advantage: 'deckA' | 'deckB' | 'even';
  reason: string;
}

interface MatchupPrediction {
  deckAWinRate: number;
  deckBWinRate: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  keyMatchups: KeyMatchup[];
  tips: {
    forDeckA: string[];
    forDeckB: string[];
  };
  fromCache?: boolean;
}

export function DeckComparison({ builderDeck, savedDecks, currentDeck }: DeckComparisonProps) {
  const { t, i18n } = useTranslation();
  const { playerTag } = useParams<{ playerTag: string }>();
  const { hasQuotaRemaining, incrementUsage } = useAIQuota();
  const { hasAccess } = useSubscription();
  const { data: predictionHistory, isLoading: isLoadingHistory } = usePredictionHistory(playerTag || null);
  
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [comparisonCards, setComparisonCards] = useState<ClashRoyaleCard[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showPredictionHistory, setShowPredictionHistory] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  // AI Matchup prediction state
  const [matchupPrediction, setMatchupPrediction] = useState<MatchupPrediction | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [showMatchupAnalysis, setShowMatchupAnalysis] = useState(true);

  const handleSelectDeck = (deckId: string, cards: ClashRoyaleCard[]) => {
    setSelectedDeckId(deckId);
    setComparisonCards(cards);
    setMatchupPrediction(null); // Reset prediction when deck changes
  };

  const calculateAvgElixir = (cards: ClashRoyaleCard[]) => {
    if (cards.length === 0) return 0;
    return cards.reduce((sum, card) => sum + (card.elixirCost || 0), 0) / cards.length;
  };

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

  const predictMatchup = async () => {
    // Check subscription first
    if (!hasAccess) {
      setShowPricingModal(true);
      return;
    }

    if (!hasQuotaRemaining) {
      toast({
        title: t('deckComparison.noQuotaRemaining'),
        description: t('deckComparison.quotaRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPrediction(true);
    setMatchupPrediction(null);

    try {
      const deckANames = builderDeck.map(c => c.name);
      const deckBNames = comparisonCards.map(c => c.name);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: t('deckComparison.signInRequired'),
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('predict-deck-matchup', {
        body: { 
          deckA: deckANames, 
          deckB: deckBNames,
          playerTag: playerTag,
          language: i18n.language 
        }
      });

      // Handle subscription required error from backend
      if (data && typeof data === 'object' && 'subscription_required' in data && data.subscription_required) {
        setShowPricingModal(true);
        return;
      }

      if (error) throw error;
      if (!data) throw new Error('No prediction returned');

      setMatchupPrediction(data as MatchupPrediction);
      // Only increment usage if it was a fresh prediction (not cached)
      if (!data.fromCache) {
        await incrementUsage();
      }
      setShowMatchupAnalysis(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Matchup prediction error:', errorMessage);
      // Handle subscription_required in error
      const errorObj = err as { subscription_required?: boolean; message?: string };
      if (errorObj?.subscription_required || errorObj?.message?.includes('subscription_required')) {
        setShowPricingModal(true);
        return;
      }
      toast({
        title: t('deckComparison.predictionFailed'),
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoadingPrediction(false);
    }
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

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getAdvantageIcon = (advantage: string) => {
    switch (advantage) {
      case 'deckA': return <Shield className="h-4 w-4 text-success" />;
      case 'deckB': return <Swords className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const canPredict = builderDeck.length === 8 && comparisonCards.length === 8;

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

            {/* AI Matchup Prediction Button */}
            {canPredict && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button
                    onClick={predictMatchup}
                    disabled={isLoadingPrediction || (!hasAccess ? false : !hasQuotaRemaining)}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {isLoadingPrediction ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('deckComparison.analyzing')}
                      </>
                    ) : (
                      <>
                        {!hasAccess && <Lock className="h-4 w-4 mr-2" />}
                        <Sparkles className="h-4 w-4 mr-2" />
                        {t('deckComparison.aiMatchupPrediction')}
                        <Badge variant="secondary" className="ml-2 text-xs">{hasAccess ? 'AI' : 'PRO'}</Badge>
                      </>
                    )}
                  </Button>
                  {hasAccess && <AIQuotaIndicator compact />}
                </div>

                {/* AI Matchup Results */}
                {matchupPrediction && (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMatchupAnalysis(!showMatchupAnalysis)}
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        {t('deckComparison.aiMatchupPrediction')}
                      </span>
                      {showMatchupAnalysis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {showMatchupAnalysis && (
                      <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg p-4 space-y-4">
                        {/* Win Rate Comparison */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{t('deckComparison.deckA')}</span>
                            <span className="font-bold text-lg">{matchupPrediction.deckAWinRate}%</span>
                          </div>
                          <Progress 
                            value={matchupPrediction.deckAWinRate} 
                            className="h-3 bg-muted"
                          />
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{t('deckComparison.deckB')}</span>
                            <span className="font-bold text-lg">{matchupPrediction.deckBWinRate}%</span>
                          </div>
                          <Progress 
                            value={matchupPrediction.deckBWinRate} 
                            className="h-3 bg-muted"
                          />
                        </div>

                        {/* Confidence & Cache Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-muted-foreground">{t('deckComparison.confidence')}:</span>
                          <Badge variant={getConfidenceBadgeVariant(matchupPrediction.confidence)}>
                            {t(`deckComparison.confidence${matchupPrediction.confidence.charAt(0).toUpperCase() + matchupPrediction.confidence.slice(1)}`)}
                          </Badge>
                          {matchupPrediction.fromCache && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {t('predictionHistory.cachedResult')}
                            </Badge>
                          )}
                        </div>

                        {/* Explanation */}
                        <div className="bg-background/50 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-sm">{matchupPrediction.explanation}</p>
                          </div>
                        </div>

                        {/* Key Matchups */}
                        {matchupPrediction.keyMatchups.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">{t('deckComparison.keyMatchups')}</h4>
                            <div className="grid gap-2">
                              {matchupPrediction.keyMatchups.map((matchup, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-background/50 rounded-lg p-2 text-sm">
                                  {getAdvantageIcon(matchup.advantage)}
                                  <span className="font-medium">{matchup.deckACard}</span>
                                  <span className="text-muted-foreground">vs</span>
                                  <span className="font-medium">{matchup.deckBCard}</span>
                                  <span className="text-muted-foreground text-xs ml-auto hidden sm:block">{matchup.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tips */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {matchupPrediction.tips.forDeckA.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm text-success">{t('deckComparison.tipsForDeckA')}</h5>
                              <ul className="space-y-1">
                                {matchupPrediction.tips.forDeckA.map((tip, idx) => (
                                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <span className="text-success">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {matchupPrediction.tips.forDeckB.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm text-destructive">{t('deckComparison.tipsForDeckB')}</h5>
                              <ul className="space-y-1">
                                {matchupPrediction.tips.forDeckB.map((tip, idx) => (
                                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <span className="text-destructive">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Prediction History Toggle */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPredictionHistory(!showPredictionHistory)}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      {showPredictionHistory 
                        ? t('predictionHistory.hideHistory') 
                        : t('predictionHistory.viewHistory')}
                    </span>
                    {showPredictionHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  
                  {showPredictionHistory && (
                    <div className="mt-4">
                      <PredictionAccuracyChart 
                        predictions={predictionHistory || []} 
                        isLoading={isLoadingHistory}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

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

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </div>
  );
}
