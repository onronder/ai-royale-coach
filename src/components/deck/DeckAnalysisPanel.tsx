import { ClashRoyalePlayer, ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArchetypeTag } from "./ArchetypeTag";
import { WinRateChart } from "./WinRateChart";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, Target, Lock, Crown } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DataLoader } from "@/components/ui/data-loader";
import { useState } from "react";
import { PricingModal } from "@/components/subscription/PricingModal";

interface DeckAnalysisResult {
  archetype: {
    name: string;
    playstyle: string;
    tips: string;
  };
  archetypeWinRates: Array<{
    archetype: string;
    wins: number;
    losses: number;
    winRate: number;
  }>;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

interface DeckAnalysisPanelProps {
  player: ClashRoyalePlayer;
  battles: ClashRoyaleBattle[];
}

export function DeckAnalysisPanel({ player, battles }: DeckAnalysisPanelProps) {
  const { t, i18n } = useTranslation();
  const [showPricing, setShowPricing] = useState(false);
  
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['deck-analysis', player.tag, i18n.language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<DeckAnalysisResult>('analyze-deck', {
        body: { playerData: player, battles, language: i18n.language }
      });
      if (error) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          throw new Error('AUTH_REQUIRED');
        }
        if (error.message?.includes('403') || error.message?.includes('subscription_required')) {
          throw new Error('SUBSCRIPTION_REQUIRED');
        }
        throw error;
      }
      // Check if response indicates subscription required
      if ((data as any)?.subscription_required) {
        throw new Error('SUBSCRIPTION_REQUIRED');
      }
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err instanceof Error && (err.message === 'AUTH_REQUIRED' || err.message === 'SUBSCRIPTION_REQUIRED')) return false;
      return failureCount < 1;
    },
  });

  if (isLoading) {
    return <DataLoader context="deck-analysis" variant="card" />;
  }

  if (error) {
    const isAuthError = error instanceof Error && error.message === 'AUTH_REQUIRED';
    const isSubscriptionError = error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED';
    
    if (isSubscriptionError) {
      return (
        <>
          <Card className="border-warning/50 bg-gradient-to-br from-warning/10 to-warning/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-3 rounded-full bg-warning/20">
                  <Crown className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-foreground mb-1">
                    {t('subscription.proFeature')}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {t('subscription.deckAnalysisRequiresPro')}
                  </p>
                </div>
                <Button
                  onClick={() => setShowPricing(true)}
                  className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {t('subscription.upgradeToPro')}
                </Button>
              </div>
            </CardContent>
          </Card>
          <PricingModal open={showPricing} onOpenChange={setShowPricing} />
        </>
      );
    }
    
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            {isAuthError ? (
              <>
                <p className="text-muted-foreground">{t('deckAnalysis.signInRequired')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/auth?mode=signin'}
                >
                  {t('deckAnalysis.signIn')}
                </Button>
              </>
            ) : (
              <p className="text-destructive">{t('deckAnalysis.failedToAnalyze')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <EmptyState
        icon={Target}
        title={t('deckAnalysis.noAnalysisTitle')}
        description={t('deckAnalysis.noAnalysisDesc')}
        variant="card"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Archetype Detection */}
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-primary/20 shadow-glow">
        <CardHeader>
          <CardTitle className="font-rajdhani text-xl">{t('deckAnalysis.deckArchetype')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ArchetypeTag 
            playstyle={analysis.archetype.playstyle} 
            name={analysis.archetype.name}
            size="lg"
          />
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.archetype.tips}</p>
        </CardContent>
      </Card>

      {/* Win Rate Chart - CALCULATED from real battles */}
      {analysis.archetypeWinRates.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
              {t('deckAnalysis.calculatedFromBattles')}
            </span>
          </div>
          <WinRateChart data={analysis.archetypeWinRates} />
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <Card className="bg-card/50 backdrop-blur border-chart-1/30 hover:border-chart-1/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-rajdhani">
              <span className="text-chart-1">✓</span>
              <span className="bg-gradient-to-r from-chart-1 to-chart-1/70 bg-clip-text text-transparent">
                {t('deckAnalysis.strengths')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm flex gap-3 items-start group">
                  <span className="text-chart-1 text-lg flex-shrink-0 group-hover:scale-110 transition-transform">✓</span>
                  <span className="text-foreground/90 leading-relaxed">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-chart-3/30 hover:border-chart-3/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-rajdhani">
              <span className="text-chart-3">✗</span>
              <span className="bg-gradient-to-r from-chart-3 to-chart-3/70 bg-clip-text text-transparent">
                {t('deckAnalysis.weaknesses')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.weaknesses.map((weakness, idx) => (
                <li key={idx} className="text-sm flex gap-3 items-start group">
                  <span className="text-chart-3 text-lg flex-shrink-0 group-hover:scale-110 transition-transform">✗</span>
                  <span className="text-foreground/90 leading-relaxed">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations - AI GENERATED */}
      {analysis.recommendations.length > 0 && (
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur border-accent/30 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between font-rajdhani">
              <div className="flex items-center gap-2">
                <span className="text-accent text-xl">💡</span>
                <span className="bg-gradient-accent bg-clip-text text-transparent">
                  {t('deckAnalysis.aiRecommendations')}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-warning/20 text-warning border border-warning/30 font-normal">
                {t('deckAnalysis.aiGenerated')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex gap-3 items-start group">
                  <span className="text-accent font-bold flex-shrink-0 group-hover:scale-110 transition-transform">→</span>
                  <span className="text-foreground/90 leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
