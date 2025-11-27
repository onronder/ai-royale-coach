import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisLoader } from "@/components/ui/analysis-loader";
import { Trophy, Zap, TrendingUp, Copy } from "lucide-react";
import { toast } from "sonner";

interface DeckTemplate {
  id: string;
  name: string;
  archetype: string;
  cards: string[];
  avg_elixir: number;
  difficulty: string;
  description: string;
  popularity_score: number;
}

interface DeckTemplatesLibraryProps {
  onImportDeck: (cards: string[]) => void;
}

export function DeckTemplatesLibrary({ onImportDeck }: DeckTemplatesLibraryProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string>("all");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["deck-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deck_templates")
        .select("*")
        .order("popularity_score", { ascending: false });

      if (error) throw error;
      return data as DeckTemplate[];
    },
  });

  const archetypes = ["all", "Cycle", "Beatdown", "Siege", "Control", "Bait"];
  
  const filteredTemplates = templates?.filter(
    (t) => selectedArchetype === "all" || t.archetype === selectedArchetype
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "text-success";
      case "intermediate": return "text-warning";
      case "advanced": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const handleImport = (template: DeckTemplate) => {
    onImportDeck(template.cards);
    toast.success(`Imported ${template.name}!`);
  };

  if (isLoading) {
    return (
      <AnalysisLoader
        message="📦 Loading deck templates..."
        icon="crown"
        showProgress
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading text-foreground">Meta Deck Templates</h2>
          <p className="text-sm text-muted-foreground">Import proven meta decks instantly</p>
        </div>
      </div>

      {/* Demo Data Disclaimer */}
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-warning">Note:</span> Difficulty ratings are estimated based on archetype complexity. Actual performance depends on player skill and card levels.
        </p>
      </div>

      <Tabs value={selectedArchetype} onValueChange={setSelectedArchetype}>
        <TabsList className="grid grid-cols-6 w-full">
          {archetypes.map((arch) => (
            <TabsTrigger key={arch} value={arch} className="capitalize">
              {arch}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedArchetype} className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTemplates?.map((template) => (
              <Card key={template.id} className="hover:shadow-glow transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">{template.archetype}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {template.cards.slice(0, 8).map((card, idx) => (
                      <div
                        key={idx}
                        className="aspect-square bg-muted rounded flex items-center justify-center text-xs text-center p-1"
                      >
                        {card}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>{template.avg_elixir} avg</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-warning" />
                      <span>Popularity: {template.popularity_score}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className={`text-sm font-medium capitalize ${getDifficultyColor(template.difficulty)}`}>
                      {template.difficulty}
                    </span>
                    <Button
                      onClick={() => handleImport(template)}
                      variant="default"
                      size="sm"
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
