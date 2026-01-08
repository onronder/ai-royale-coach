import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { DataLoader } from "@/components/ui/data-loader";
import { Trophy, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AIFeaturePreview } from "@/components/subscription/AIFeaturePreview";
import { PricingModal } from "@/components/subscription/PricingModal";
import { WinRatePredictionPreview } from "@/components/subscription/AIPreviewContent";

interface WinRatePrediction {
  trophy_range: string;
  predicted_win_rate: number;
  confidence: number;
  tips: string[];
  is_sweet_spot: boolean;
}

interface TrophyWinRatePredictorProps {
  deck: string[];
  currentTrophies?: number;
}

export function TrophyWinRatePredictor({ deck, currentTrophies = 5000 }: TrophyWinRatePredictorProps) {
  const { t, i18n } = useTranslation();
  const [targetTrophies, setTargetTrophies] = useState(currentTrophies);
  const [predictions, setPredictions] = useState<WinRatePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPredictedLanguage, setLastPredictedLanguage] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Clear predictions when language changes
  useEffect(() => {
    if (lastPredictedLanguage && lastPredictedLanguage !== i18n.language && predictions.length > 0) {
      setPredictions([]);
      toast.info(t('trophyPredictor.languageChanged'));
    }
  }, [i18n.language, lastPredictedLanguage, predictions.length, t]);

  const fetchPredictions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-deck-performance", {
        body: { deck, targetTrophies, language: i18n.language },
      });

      // Check for subscription_required in response
      if (data && typeof data === 'object' && 'subscription_required' in data && data.subscription_required) {
        setShowPricingModal(true);
        return;
      }

      if (error) {
        if (error.message?.includes('403') || error.message?.includes('subscription')) {
          setShowPricingModal(true);
          return;
        }
        throw error;
      }
      setPredictions(data.predictions);
      setLastPredictedLanguage(i18n.language);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error fetching predictions:", errorMessage);
      const errorObj = error as { subscription_required?: boolean; message?: string };
      if (errorObj?.subscription_required || errorObj?.message?.includes('subscription')) {
        setShowPricingModal(true);
        return;
      }
      toast.error(t('trophyPredictor.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-success";
    if (confidence >= 60) return "text-warning";
    return "text-muted-foreground";
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 55) return "text-success";
    if (winRate >= 50) return "text-warning";
    return "text-destructive";
  };

  if (isLoading) {
    return <DataLoader context="analytics" variant="card" customMessage={t('trophyPredictor.predicting')} />;
  }

  return (
    <>
    <AIFeaturePreview 
      featureName={t('subscription.features.winRatePredictions')}
      previewContent={<WinRatePredictionPreview />}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              {t('trophyPredictor.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('trophyPredictor.targetRange')}</span>
                <Badge variant="secondary">{targetTrophies} 🏆</Badge>
              </div>
              <Slider
                value={[targetTrophies]}
                onValueChange={(val) => setTargetTrophies(val[0])}
                min={3000}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3000</span>
                <span>10000</span>
              </div>
            </div>

            <Button onClick={fetchPredictions} className="w-full gap-2">
              <Target className="h-4 w-4" />
              {t('trophyPredictor.predict')}
            </Button>

            {predictions.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                {predictions.map((pred, idx) => (
                  <Card key={idx} className={`${pred.is_sweet_spot ? "border-primary shadow-glow" : ""}`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-warning" />
                          <span className="font-heading">{pred.trophy_range}</span>
                          {pred.is_sweet_spot && (
                            <Badge variant="default" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {t('trophyPredictor.sweetSpot')}
                            </Badge>
                          )}
                        </div>
                        <span className={`text-lg font-heading ${getWinRateColor(pred.predicted_win_rate)}`}>
                          {pred.predicted_win_rate.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('trophyPredictor.confidence')}</span>
                        <span className={getConfidenceColor(pred.confidence)}>
                          {pred.confidence}%
                        </span>
                      </div>

                      {pred.tips.length > 0 && (
                        <div className="space-y-1 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground">{t('trophyPredictor.arenaTips')}:</p>
                          <ul className="space-y-1">
                            {pred.tips.map((tip, tipIdx) => (
                              <li key={tipIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AIFeaturePreview>
    <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </>
  );
}