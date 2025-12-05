import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PredictionAccuracyChart } from "@/components/deck/PredictionAccuracyChart";
import { usePredictionHistory } from "@/hooks/usePredictionHistory";
import { DataLoader } from "@/components/ui/data-loader";
import { Target, TrendingUp, TrendingDown, Activity, Percent } from "lucide-react";

interface PredictionAccuracyDashboardProps {
  playerTag: string;
}

export function PredictionAccuracyDashboard({ playerTag }: PredictionAccuracyDashboardProps) {
  const { t } = useTranslation();
  const { data: predictions, isLoading } = usePredictionHistory(playerTag);

  if (isLoading) {
    return <DataLoader context="analytics" variant="card" />;
  }

  const predictionsArray = predictions || [];
  const predictionsWithActuals = predictionsArray.filter(p => p.actualBattlesTotal > 0);
  
  // Calculate stats
  const totalPredictions = predictionsArray.length;
  const trackedPredictions = predictionsWithActuals.length;
  const totalBattlesTracked = predictionsWithActuals.reduce((sum, p) => sum + p.actualBattlesTotal, 0);
  
  const avgError = trackedPredictions > 0
    ? predictionsWithActuals.reduce((sum, p) => sum + Math.abs(p.predictionError || 0), 0) / trackedPredictions
    : null;

  const highAccuracyCount = predictionsWithActuals.filter(p => Math.abs(p.predictionError || 0) <= 10).length;
  const accuracyRate = trackedPredictions > 0 ? (highAccuracyCount / trackedPredictions) * 100 : null;

  // Best and worst predictions
  const sortedByError = [...predictionsWithActuals].sort((a, b) => 
    Math.abs(a.predictionError || 0) - Math.abs(b.predictionError || 0)
  );
  const bestPrediction = sortedByError[0];
  const worstPrediction = sortedByError[sortedByError.length - 1];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="arena" className="border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPredictions}</p>
                <p className="text-xs text-muted-foreground">{t('analytics.predictions.total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="arena" className="border-gold/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBattlesTracked}</p>
                <p className="text-xs text-muted-foreground">{t('analytics.predictions.battlesTracked')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="arena" className="border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Percent className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {avgError !== null ? `±${avgError.toFixed(1)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">{t('analytics.predictions.avgError')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="arena" className="border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {accuracyRate !== null ? `${accuracyRate.toFixed(0)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">{t('analytics.predictions.accuracyRate')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <PredictionAccuracyChart predictions={predictionsArray} isLoading={isLoading} />

      {/* Best/Worst Predictions */}
      {trackedPredictions >= 2 && (
        <div className="grid md:grid-cols-2 gap-4">
          {bestPrediction && (
            <Card variant="arena" className="border-emerald-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  {t('analytics.predictions.mostAccurate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">{t('analytics.predictions.predicted')}</span>
                    <Badge variant="outline">{bestPrediction.predictedWinRateA}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">{t('analytics.predictions.actual')}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {bestPrediction.actualWinRateA}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">{t('analytics.predictions.error')}</span>
                    <span className="font-medium text-emerald-500">
                      ±{Math.abs(bestPrediction.predictionError || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-2">
                    {bestPrediction.deckACards.slice(0, 4).join(', ')}...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {worstPrediction && worstPrediction !== bestPrediction && (
            <Card variant="arena" className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  {t('analytics.predictions.leastAccurate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">{t('analytics.predictions.predicted')}</span>
                    <Badge variant="outline">{worstPrediction.predictedWinRateA}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">{t('analytics.predictions.actual')}</span>
                    <Badge variant="destructive">
                      {worstPrediction.actualWinRateA}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">{t('analytics.predictions.error')}</span>
                    <span className="font-medium text-destructive">
                      ±{Math.abs(worstPrediction.predictionError || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-2">
                    {worstPrediction.deckACards.slice(0, 4).join(', ')}...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
