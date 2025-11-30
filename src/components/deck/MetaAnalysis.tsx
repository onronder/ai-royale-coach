import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataLoader } from "@/components/ui/data-loader";
import { TrendingUp, TrendingDown, Flame, Snowflake, Lock } from "lucide-react";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { PricingModal } from "@/components/subscription/PricingModal";

interface MetaTrend {
  archetype: string;
  win_rate: number;
  usage_rate: number;
  trend: "hot" | "cold" | "stable";
  change_7d: number;
  popularity: number;
}

export function MetaAnalysis() {
  const { t, i18n } = useTranslation();
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const { data: metaData, isLoading, error } = useQuery({
    queryKey: ["meta-trends", i18n.language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analyze-meta-trends", {
        body: { language: i18n.language }
      });
      
      // Check for subscription_required in response
      if ((data as any)?.subscription_required) {
        throw new Error('SUBSCRIPTION_REQUIRED');
      }
      
      if (error) {
        if (error.message?.includes('403') || error.message?.includes('subscription')) {
          throw new Error('SUBSCRIPTION_REQUIRED');
        }
        throw error;
      }
      return data.trends as MetaTrend[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, err) => {
      if (err instanceof Error && err.message === 'SUBSCRIPTION_REQUIRED') return false;
      return failureCount < 2;
    },
  });
  
  const requiresSubscription = error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED';

  if (isLoading) {
    return <DataLoader context="analytics" variant="card" customMessage={t('metaAnalysis.analyzing')} />;
  }
  
  if (requiresSubscription) {
    return (
      <>
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Lock className="h-12 w-12 text-warning" />
              <div className="text-center">
                <h3 className="text-lg font-heading text-foreground">{t('subscription.metaAnalysisRequiresPro')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('subscription.upgradeToPro')}</p>
              </div>
              <Button onClick={() => setShowPricingModal(true)} className="gap-2">
                <Lock className="h-4 w-4" />
                {t('subscription.upgrade')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
      </>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "hot": return Flame;
      case "cold": return Snowflake;
      default: return TrendingUp;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "hot": return "text-destructive";
      case "cold": return "text-info";
      default: return "text-muted-foreground";
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "hot": return t('metaAnalysis.hotTrend');
      case "cold": return t('metaAnalysis.coldTrend');
      default: return t('metaAnalysis.stableTrend');
    }
  };

  return (
    <SubscriptionGate feature={t('subscription.features.metaAnalysis')}>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-heading text-foreground">{t('metaAnalysis.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('metaAnalysis.subtitle')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metaData?.map((trend) => {
            const TrendIcon = getTrendIcon(trend.trend);
            const trendColor = getTrendColor(trend.trend);

            return (
              <Card key={trend.archetype} className="hover:shadow-glow transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{trend.archetype}</CardTitle>
                    <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('metaAnalysis.winRate')}</span>
                    <Badge variant="default">{trend.win_rate.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('metaAnalysis.usage')}</span>
                    <Badge variant="secondary">{trend.usage_rate.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('metaAnalysis.change7d')}</span>
                    <div className="flex items-center gap-1">
                      {trend.change_7d > 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className={trend.change_7d > 0 ? "text-success" : "text-destructive"}>
                        {trend.change_7d > 0 ? "+" : ""}{trend.change_7d.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{getTrendLabel(trend.trend)}</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < Math.floor(trend.popularity / 20) ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SubscriptionGate>
  );
}