import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/cards/CardImage";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { Sparkles, Save, Zap, TrendingUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedAnalysisTabs } from "./AdvancedAnalysisTabs";

interface DeckBuilderProps {
  availableCards: ClashRoyaleCard[];
  userId: string;
}

interface DeckAnalysis {
  synergy_score: number;
  meta_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  avg_elixir: number;
}

interface AdvancedDeckAnalysis {
  elixirAnalysis: {
    avgElixir: number;
    cycleSpeed: 'fast' | 'medium' | 'slow';
    defensiveCost: number;
    offensiveCost: number;
    elixirDistribution: { cost: number; count: number }[];
    tradeScenarios: any[];
  };
  synergyMatrix: {
    pairs: any[];
    overallScore: number;
    topSynergies: string[];
    antiSynergies: string[];
  };
  matchupPredictions: any[];
}

export function DeckBuilder({ availableCards, userId }: DeckBuilderProps) {
  const [selectedCards, setSelectedCards] = useState<ClashRoyaleCard[]>([]);
  const [deckName, setDeckName] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedDeckAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addCard = (card: ClashRoyaleCard) => {
    if (selectedCards.length >= 8) {
      toast.error('Deck is full (8 cards maximum)');
      return;
    }
    if (selectedCards.find(c => c.id === card.id)) {
      toast.error('Card already in deck');
      return;
    }
    setSelectedCards([...selectedCards, card]);
    setAnalysis(null); // Reset analysis when deck changes
  };

  const removeCard = (cardId: number) => {
    setSelectedCards(selectedCards.filter(c => c.id !== cardId));
    setAnalysis(null);
  };

  const analyzeDeck = async () => {
    if (selectedCards.length !== 8) {
      toast.error('Complete your deck with 8 cards first');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Run both basic and advanced analysis in parallel
      const [basicResult, advancedResult] = await Promise.all([
        supabase.functions.invoke('analyze-deck-builder', {
          body: { cards: selectedCards }
        }),
        supabase.functions.invoke('analyze-deck-advanced', {
          body: { cards: selectedCards }
        })
      ]);

      if (basicResult.error) throw basicResult.error;
      if (advancedResult.error) throw advancedResult.error;
      
      setAnalysis(basicResult.data);
      setAdvancedAnalysis(advancedResult.data);
      toast.success('Complete deck analysis ready!');
    } catch (error) {
      console.error('Error analyzing deck:', error);
      toast.error('Failed to analyze deck');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveDeck = async () => {
    if (selectedCards.length !== 8) {
      toast.error('Complete your deck with 8 cards first');
      return;
    }
    if (!deckName.trim()) {
      toast.error('Please enter a deck name');
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
      toast.success('Deck saved successfully!');
      setDeckName("");
      setDeckDescription("");
    } catch (error) {
      console.error('Error saving deck:', error);
      toast.error('Failed to save deck');
    } finally {
      setIsSaving(false);
    }
  };

  const avgElixir = selectedCards.reduce((sum, card) => sum + (card.elixirCost || 0), 0) / selectedCards.length;

  return (
    <div className="space-y-6">
      {/* Deck Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Deck ({selectedCards.length}/8)</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              Avg: {avgElixir.toFixed(1)} elixir
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
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
            </Button>
            <Button 
              onClick={saveDeck} 
              disabled={selectedCards.length !== 8 || isSaving}
              variant="outline"
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Deck'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Deck Form */}
      {selectedCards.length === 8 && (
        <Card>
          <CardHeader>
            <CardTitle>Deck Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Deck name (e.g., Fast Cycle Hog)"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
            />
            <Textarea
              placeholder="Deck description (optional)"
              value={deckDescription}
              onChange={(e) => setDeckDescription(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      )}

      {(analysis || advancedAnalysis) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              AI Deck Analysis
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
          <CardTitle>Available Cards</CardTitle>
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
    </div>
  );
}
