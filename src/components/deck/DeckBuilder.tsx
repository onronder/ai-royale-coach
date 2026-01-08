import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardImage } from "@/components/cards/CardImage";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { Sparkles, Save, Zap, X, Library, GitCompare, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DataLoader } from "@/components/ui/data-loader";
import { AdvancedAnalysisTabs } from "./AdvancedAnalysisTabs";
import { DeckTemplatesLibrary } from "./DeckTemplatesLibrary";
import { DeckComparison } from "./DeckComparison";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "@/components/subscription/PricingModal";

interface SavedDeck {
  id: string;
  name: string;
  cards: ClashRoyaleCard[];
  avg_elixir?: number;
  archetype?: string;
}

interface DeckBuilderProps {
  availableCards: ClashRoyaleCard[];
  userId: string;
  savedDecks?: SavedDeck[];
  currentDeck?: ClashRoyaleCard[] | null;
  userCollection?: string[];
  playerTrophies?: number;
}

interface DeckAnalysis {
  synergy_score: number | null; // Removed - requires battle history
  meta_score: number | null; // Removed - requires battle history
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  avg_elixir: number;
}

import { 
  AdvancedDeckAnalysis, 
  TradeScenario, 
  ElixirDistributionEntry,
  SynergyMatrix,
  MatchupPrediction 
} from "@/types/analysis.types";

interface LocalAdvancedDeckAnalysis {
  elixirAnalysis: {
    avgElixir: number;
    cycleSpeed: 'fast' | 'medium' | 'slow';
    defensiveCost: number;
    offensiveCost: number;
    elixirDistribution: ElixirDistributionEntry[];
    tradeScenarios: TradeScenario[];
  };
  composition: {
    winConditions: string[];
    defenseCards: string[];
    cycleCards: string[];
    spells: string[];
    missingRoles: string[];
    balanceNotes: string;
  };
  synergyMatrix: SynergyMatrix | null;
  matchupPredictions: MatchupPrediction[] | null;
}

export function DeckBuilder({ 
  availableCards, 
  userId, 
  savedDecks = [], 
  currentDeck = null,
  userCollection = [],
  playerTrophies = 0
}: DeckBuilderProps) {
  const { t, i18n } = useTranslation();
  const { hasAccess } = useSubscription();
  const [selectedCards, setSelectedCards] = useState<ClashRoyaleCard[]>([]);
  const [deckName, setDeckName] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [advancedAnalysis, setAdvancedAnalysis] = useState<LocalAdvancedDeckAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [lastAnalyzedLanguage, setLastAnalyzedLanguage] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Clear analysis when language changes to force re-analysis in new language
  useEffect(() => {
    if (lastAnalyzedLanguage && lastAnalyzedLanguage !== i18n.language && (analysis || advancedAnalysis)) {
      setAnalysis(null);
      setAdvancedAnalysis(null);
      toast.info(t('deck.languageChangedReanalyze'));
    }
  }, [i18n.language, lastAnalyzedLanguage, analysis, advancedAnalysis, t]);

  const addCard = (card: ClashRoyaleCard) => {
    if (selectedCards.length >= 8) {
      toast.error(t('deck.deckFull'));
      return;
    }
    if (selectedCards.find(c => c.id === card.id)) {
      toast.error(t('deck.cardAlreadyInDeck'));
      return;
    }
    setSelectedCards([...selectedCards, card]);
    setAnalysis(null);
  };

  const removeCard = (cardId: number) => {
    setSelectedCards(selectedCards.filter(c => c.id !== cardId));
    setAnalysis(null);
  };

  const importDeck = (cards: string[]) => {
    const importedCards = cards
      .map(cardName => availableCards.find(c => c.name === cardName))
      .filter((c): c is ClashRoyaleCard => c !== undefined);
    
    setSelectedCards(importedCards);
    setAnalysis(null);
    setAdvancedAnalysis(null);
    setActiveTab("builder");
    toast.success(t('deck.imported', { count: importedCards.length }));
  };

  const analyzeDeck = async () => {
    if (selectedCards.length !== 8) {
      toast.error(t('deck.completeDeckFirst'));
      return;
    }

    if (!hasAccess) {
      setShowPricingModal(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const [basicResult, advancedResult] = await Promise.all([
        supabase.functions.invoke('analyze-deck-builder', {
          body: { cards: selectedCards, language: i18n.language }
        }),
        supabase.functions.invoke('analyze-deck-advanced', {
          body: { cards: selectedCards, language: i18n.language }
        })
      ]);

      // Handle subscription required errors
      if (basicResult.data?.subscription_required || advancedResult.data?.subscription_required) {
        setShowPricingModal(true);
        return;
      }

      if (basicResult.error) throw basicResult.error;
      if (advancedResult.error) throw advancedResult.error;
      
      setAnalysis(basicResult.data);
      setAdvancedAnalysis(advancedResult.data);
      setLastAnalyzedLanguage(i18n.language);
      toast.success(t('deck.analysisReady'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error analyzing deck:', errorMessage);
      // Check for subscription_required in error response
      const errorObj = error as { subscription_required?: boolean; message?: string };
      if (errorObj?.message?.includes('subscription_required') || errorObj?.subscription_required) {
        setShowPricingModal(true);
        return;
      }
      toast.error(t('deck.analyzeFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveDeck = async () => {
    if (selectedCards.length !== 8) {
      toast.error(t('deck.completeDeckFirst'));
      return;
    }
    if (!deckName.trim()) {
      toast.error(t('deck.enterDeckName'));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('saved_decks').insert([{
        user_id: userId,
        name: deckName,
        description: deckDescription || null,
        cards: selectedCards as any,
        synergy_score: analysis?.synergy_score || null,
        meta_score: analysis?.meta_score || null,
        avg_elixir: analysis?.avg_elixir || null,
      }]);

      if (error) throw error;
      toast.success(t('deck.savedSuccess'));
      setDeckName("");
      setDeckDescription("");
    } catch (error) {
      console.error('Error saving deck:', error);
      toast.error(t('deck.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const avgElixir = selectedCards.reduce((sum, card) => sum + (card.elixirCost || 0), 0) / selectedCards.length;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">{t('deck.builder')}</TabsTrigger>
          <TabsTrigger value="templates">
            <Library className="w-4 h-4 mr-2" />
            {t('deck.templates')}
          </TabsTrigger>
          <TabsTrigger value="compare" disabled={selectedCards.length < 8}>
            <GitCompare className="w-4 h-4 mr-2" />
            {t('deck.compare')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6 mt-6">
          {/* Deck Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('deck.yourDeck')} ({selectedCards.length}/8)</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  {t('deck.avgElixir')}: {avgElixir.toFixed(1)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[...Array(8)].map((_, idx) => {
                  const card = selectedCards[idx];
                  return (
                    <div key={idx} className="relative">
                      {card ? (
                        <>
                          <CardImage card={card} size="md" showLevel showElixir />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                            onClick={() => removeCard(card.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <div className="w-20 h-28 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground">
                          +
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={analyzeDeck} 
                  disabled={selectedCards.length !== 8 || isAnalyzing}
                  className="flex-1"
                >
                  {!hasAccess && <Lock className="w-4 h-4 mr-2" />}
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isAnalyzing ? t('deck.analyzing') : t('deck.aiAnalyze')}
                  {!hasAccess && <Badge variant="secondary" className="ml-2 text-xs">PRO</Badge>}
                </Button>
                <Button 
                  onClick={saveDeck} 
                  disabled={selectedCards.length !== 8 || isSaving}
                  variant="outline"
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? t('deck.saving') : t('deck.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Deck Form */}
          {selectedCards.length === 8 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('deck.deckDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder={t('deck.deckNamePlaceholder')}
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                />
                <Textarea
                  placeholder={t('deck.deckDescPlaceholder')}
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {isAnalyzing && (
            <DataLoader 
              context="deck-analysis" 
              variant="card"
              customMessage={t('deck.analyzingStrategy')}
            />
          )}

          {(analysis || advancedAnalysis) && !isAnalyzing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {t('deck.aiDeckAnalysis')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdvancedAnalysisTabs 
                  advancedAnalysis={advancedAnalysis}
                  basicAnalysis={analysis}
                  cardNames={selectedCards.map(c => c.name)}
                />
              </CardContent>
            </Card>
          )}

          {/* Available Cards */}
          <Card>
            <CardHeader>
              <CardTitle>{t('deck.availableCards')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-96 overflow-y-auto">
                {availableCards.map((card) => (
                  <div 
                    key={card.id} 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => addCard(card)}
                  >
                    <CardImage card={card} size="sm" showElixir />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <DeckTemplatesLibrary 
            onImportDeck={importDeck} 
            userCollection={userCollection}
            playerTrophies={playerTrophies}
          />
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          {selectedCards.length === 8 ? (
            <DeckComparison
              builderDeck={selectedCards}
              savedDecks={savedDecks}
              currentDeck={currentDeck}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('deck.completeDeckForComparison')}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </div>
  );
}
