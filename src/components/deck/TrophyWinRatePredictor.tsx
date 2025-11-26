import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { AnalysisLoader } from "@/components/ui/analysis-loader";
import { Trophy, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

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
  const [targetTrophies, setTargetTrophies] = useState(currentTrophies);
  const [predictions, setPredictions] = useState<WinRatePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPredictions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-deck-performance", {
        body: { deck, targetTrophies },
      });

      if (error) throw error;
      setPredictions(data.predictions);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      toast.error("Failed to fetch win rate predictions");
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
    return (
      <AnalysisLoader
        message="🏆 Predicting win rates across trophy ranges..."
        icon="crown"
        showProgress
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Trophy Win Rate Predictor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Target Trophy Range</span>
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
            Predict Performance
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
                            Sweet Spot
                          </Badge>
                        )}
                      </div>
                      <span className={`text-lg font-heading ${getWinRateColor(pred.predicted_win_rate)}`}>
                        {pred.predicted_win_rate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className={getConfidenceColor(pred.confidence)}>
                        {pred.confidence}%
                      </span>
                    </div>

                    {pred.tips.length > 0 && (
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground">Arena Tips:</p>
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
  );
}
