import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DataLoader } from "@/components/ui/data-loader";
import { RefreshCw, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { toast } from "sonner";
import { AIFeaturePreview } from "@/components/subscription/AIFeaturePreview";
import { PricingModal } from "@/components/subscription/PricingModal";
import { CardReplacementPreview } from "@/components/subscription/AIPreviewContent";

interface Suggestion {
  card: string;
  synergy_impact: number;
  meta_impact: number;
  reasoning: string;
  elixir_cost: number;
}

interface CardReplacementSuggesterProps {
  currentDeck: string[];
  targetCard: string;
  userCollection?: string[];
  onReplace: (oldCard: string, newCard: string) => void;
}

export function CardReplacementSuggester({
  currentDeck,
  targetCard,
  userCollection,
  onReplace,
}: CardReplacementSuggesterProps) {
  const { t, i18n } = useTranslation();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedLanguage, setLastFetchedLanguage] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Clear suggestions when language changes
  useEffect(() => {
    if (lastFetchedLanguage && lastFetchedLanguage !== i18n.language && suggestions.length > 0) {
      setSuggestions([]);
      toast.info(t('cardReplacements.languageChanged'));
    }
  }, [i18n.language, lastFetchedLanguage, suggestions.length, t]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-card-replacements", {
        body: {
          currentDeck,
          targetCard,
          availableCards: userCollection,
          language: i18n.language,
        },
      });

      // Check for subscription_required in response
      if ((data as any)?.subscription_required) {
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
      setSuggestions(data.suggestions);
      setLastFetchedLanguage(i18n.language);
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);
      if (error?.subscription_required || error?.message?.includes('subscription')) {
        setShowPricingModal(true);
        return;
      }
      toast.error(t('cardReplacements.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplace = (newCard: string) => {
    onReplace(targetCard, newCard);
    toast.success(t('cardReplacements.replaced', { oldCard: targetCard, newCard }));
  };

  const getImpactColor = (impact: number) => {
    if (impact > 5) return "text-success";
    if (impact < -5) return "text-destructive";
    return "text-muted-foreground";
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0) return TrendingUp;
    if (impact < 0) return TrendingDown;
    return Zap;
  };

  if (!suggestions.length && !isLoading) {
    return (
      <>
      <AIFeaturePreview 
        featureName={t('subscription.features.cardReplacements')}
        previewContent={<CardReplacementPreview />}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('cardReplacements.title')}</span>
              <Badge variant="secondary">{t('common.aiPowered')}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {t('cardReplacements.getSuggestions', { card: targetCard })}
              </p>
              <Button onClick={fetchSuggestions} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('cardReplacements.findReplacements')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </AIFeaturePreview>
      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
      </>
    );
  }

  if (isLoading) {
    return <DataLoader context="replacements" variant="card" customMessage={t('cardReplacements.finding')} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('cardReplacements.optionsFor', { card: targetCard })}</span>
          <Button variant="ghost" size="sm" onClick={fetchSuggestions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion, idx) => {
            const ImpactIcon = getImpactIcon(suggestion.synergy_impact);
            
            return (
              <Card key={idx} className="bg-accent/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-heading text-foreground">{suggestion.card}</h4>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.elixir_cost} {t('common.elixir')}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleReplace(suggestion.card)}>
                      {t('cardReplacements.useThis')}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <ImpactIcon className={`h-4 w-4 ${getImpactColor(suggestion.synergy_impact)}`} />
                      <span className={getImpactColor(suggestion.synergy_impact)}>
                        {t('cardReplacements.synergy')}: {suggestion.synergy_impact > 0 ? "+" : ""}{suggestion.synergy_impact}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImpactIcon className={`h-4 w-4 ${getImpactColor(suggestion.meta_impact)}`} />
                      <span className={getImpactColor(suggestion.meta_impact)}>
                        {t('cardReplacements.meta')}: {suggestion.meta_impact > 0 ? "+" : ""}{suggestion.meta_impact}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}