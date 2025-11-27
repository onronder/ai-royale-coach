import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DataLoader } from "@/components/ui/data-loader";
import { RefreshCw, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { toast } from "sonner";

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-card-replacements", {
        body: {
          currentDeck,
          targetCard,
          availableCards: userCollection,
        },
      });

      if (error) throw error;
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Failed to fetch card suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplace = (newCard: string) => {
    onReplace(targetCard, newCard);
    toast.success(`Replaced ${targetCard} with ${newCard}`);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Card Replacement Suggester</span>
            <Badge variant="secondary">AI Powered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Get AI-powered suggestions to replace <strong>{targetCard}</strong>
            </p>
            <Button onClick={fetchSuggestions} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Find Replacements
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <DataLoader context="replacements" variant="card" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Replacement Options for {targetCard}</span>
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
                        {suggestion.elixir_cost} elixir
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleReplace(suggestion.card)}>
                      Use This
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <ImpactIcon className={`h-4 w-4 ${getImpactColor(suggestion.synergy_impact)}`} />
                      <span className={getImpactColor(suggestion.synergy_impact)}>
                        Synergy: {suggestion.synergy_impact > 0 ? "+" : ""}{suggestion.synergy_impact}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImpactIcon className={`h-4 w-4 ${getImpactColor(suggestion.meta_impact)}`} />
                      <span className={getImpactColor(suggestion.meta_impact)}>
                        Meta: {suggestion.meta_impact > 0 ? "+" : ""}{suggestion.meta_impact}
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
