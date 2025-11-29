import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PredictionHistoryEntry } from '@/hooks/usePredictionHistory';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Swords, Minus } from 'lucide-react';
import { format } from 'date-fns';

// Calculate trend by comparing older vs newer prediction errors
function calculateTrend(predictions: PredictionHistoryEntry[]): 'improving' | 'worsening' | 'stable' | null {
  const withActuals = predictions
    .filter(p => p.actualBattlesTotal > 0 && p.predictionError !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first
  
  if (withActuals.length < 4) return null; // Not enough data
  
  const midpoint = Math.floor(withActuals.length / 2);
  const olderPredictions = withActuals.slice(0, midpoint);
  const newerPredictions = withActuals.slice(midpoint);
  
  const olderAvgError = olderPredictions.reduce((sum, p) => sum + Math.abs(p.predictionError!), 0) / olderPredictions.length;
  const newerAvgError = newerPredictions.reduce((sum, p) => sum + Math.abs(p.predictionError!), 0) / newerPredictions.length;
  
  const errorDiff = newerAvgError - olderAvgError;
  
  if (errorDiff <= -5) return 'improving'; // Error decreased by 5+ points
  if (errorDiff >= 5) return 'worsening'; // Error increased by 5+ points
  return 'stable';
}

interface PredictionAccuracyChartProps {
  predictions: PredictionHistoryEntry[];
  isLoading?: boolean;
}

export function PredictionAccuracyChart({ predictions, isLoading }: PredictionAccuracyChartProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              {t('common.loading')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="h-[200px] flex flex-col items-center justify-center text-center gap-3">
            <Target className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {t('predictionHistory.noPredictions')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data - show last 10 predictions with actual results
  const chartData = predictions
    .filter(p => p.actualBattlesTotal > 0)
    .slice(0, 10)
    .reverse()
    .map((p, index) => ({
      name: `#${index + 1}`,
      predicted: p.predictedWinRateA,
      actual: p.actualWinRateA || 0,
      battles: p.actualBattlesTotal,
      error: p.predictionError !== null ? Math.abs(p.predictionError) : null,
      date: format(new Date(p.createdAt), 'MMM d'),
      deckA: p.deckACards.slice(0, 3).join(', '),
    }));

  // Calculate overall accuracy
  const predictionsWithActuals = predictions.filter(p => p.actualBattlesTotal > 0);
  const avgError = predictionsWithActuals.length > 0
    ? predictionsWithActuals.reduce((sum, p) => sum + Math.abs(p.predictionError || 0), 0) / predictionsWithActuals.length
    : null;

  const getAccuracyColor = (error: number | null) => {
    if (error === null) return 'hsl(var(--muted-foreground))';
    if (error <= 10) return 'hsl(var(--chart-2))'; // Green - high accuracy
    if (error <= 20) return 'hsl(var(--chart-4))'; // Yellow - moderate
    return 'hsl(var(--destructive))'; // Red - low accuracy
  };

  const getAccuracyBadge = (error: number | null) => {
    if (error === null) return null;
    if (error <= 10) return { label: t('predictionHistory.highAccuracy'), variant: 'default' as const };
    if (error <= 20) return { label: t('predictionHistory.mediumAccuracy'), variant: 'secondary' as const };
    return { label: t('predictionHistory.lowAccuracy'), variant: 'destructive' as const };
  };

  const accuracyBadge = getAccuracyBadge(avgError);
  
  // Calculate prediction accuracy trend
  const trend = calculateTrend(predictions);
  
  // Get trend icon and color
  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (trend === 'worsening') return <TrendingDown className="h-5 w-5 text-destructive" />;
    if (trend === 'stable') return <Minus className="h-5 w-5 text-muted-foreground" />;
    return <Target className="h-5 w-5 text-primary" />;
  };
  
  const getTrendBadgeIcon = () => {
    if (trend === 'improving') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'worsening') return <TrendingDown className="h-3 w-3 text-destructive" />;
    return null;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {getTrendIcon()}
            {t('predictionHistory.title')}
          </CardTitle>
          {accuracyBadge && (
            <Badge variant={accuracyBadge.variant} className="text-xs flex items-center gap-1">
              {accuracyBadge.label}: {avgError !== null ? `±${avgError.toFixed(1)}%` : '-'}
              {getTrendBadgeIcon()}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t('predictionHistory.description')}
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === 'predicted' ? t('predictionHistory.predictedWinRate') : t('predictionHistory.actualWinRate')
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${data.date} • ${data.battles} ${t('predictionHistory.battlesTracked').toLowerCase()}`;
                    }
                    return label;
                  }}
                />
                <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                <Bar dataKey="predicted" name="predicted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Bar dataKey="actual" name="actual" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getAccuracyColor(entry.error)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-center gap-3">
            <Swords className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t('predictionHistory.noBattlesYet', 'Play some battles to see accuracy tracking')}
            </p>
          </div>
        )}

        {/* Recent Predictions List */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('predictionHistory.recentPredictions', 'Recent Predictions')}
          </h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {predictions.slice(0, 5).map((prediction) => (
              <div
                key={prediction.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {prediction.confidence}
                  </Badge>
                  <span className="truncate text-muted-foreground">
                    {prediction.deckACards.slice(0, 2).join(', ')}...
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-medium">{prediction.predictedWinRateA}%</div>
                    <div className="text-xs text-muted-foreground">
                      {t('predictionHistory.predictedWinRate')}
                    </div>
                  </div>
                  {prediction.actualBattlesTotal > 0 ? (
                    <div className="text-right">
                      <div className="font-medium" style={{ color: getAccuracyColor(prediction.predictionError) }}>
                        {prediction.actualWinRateA}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {prediction.actualBattlesTotal} {t('predictionHistory.battlesTracked').toLowerCase()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right text-muted-foreground">
                      <div className="text-xs">-</div>
                      <div className="text-xs">0 battles</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
