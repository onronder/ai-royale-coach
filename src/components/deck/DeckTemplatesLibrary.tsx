import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataLoader } from "@/components/ui/data-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Zap, TrendingUp, Copy, Star, Info } from "lucide-react";
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
  userCollection?: string[];
  playerTrophies?: number;
}

export function DeckTemplatesLibrary({ 
  onImportDeck, 
  userCollection = [], 
  playerTrophies = 0 
}: DeckTemplatesLibraryProps) {
  const { t } = useTranslation();
  const [selectedArchetype, setSelectedArchetype] = useState<string>("recommended");

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

  // Determine skill level based on trophies
  const getSkillLevel = (trophies: number): string => {
    if (trophies < 4000) return 'beginner';
    if (trophies < 6000) return 'intermediate';
    return 'advanced';
  };

  const skillLevel = getSkillLevel(playerTrophies);

  // Compute recommended decks based on user's collection and skill
  const recommendedDecks = useMemo(() => {
    if (!templates || userCollection.length === 0) return [];
    
    return templates
      .filter(template => {
        // Check if user owns all cards in the deck
        const ownsAllCards = template.cards.every(card => 
          userCollection.some(ownedCard => 
            ownedCard.toLowerCase() === card.toLowerCase()
          )
        );
        if (!ownsAllCards) return false;
        
        // Filter by skill level (advanced players can use all decks)
        if (skillLevel === 'beginner' && template.difficulty === 'advanced') return false;
        if (skillLevel === 'intermediate' && template.difficulty === 'advanced') return false;
        
        return true;
      })
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 10);
  }, [templates, userCollection, skillLevel]);

  const archetypes = ["recommended", "all", "Cycle", "Beatdown", "Siege", "Control", "Bait"];
  
  // Default to "recommended" if there are recommendations, otherwise "all"
  const effectiveArchetype = selectedArchetype === "recommended" && recommendedDecks.length === 0 
    ? "all" 
    : selectedArchetype;
  
  const filteredTemplates = effectiveArchetype === "recommended"
    ? recommendedDecks
    : templates?.filter(
        (t) => effectiveArchetype === "all" || t.archetype === effectiveArchetype
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
    toast.success(t('templates.imported', { name: template.name }));
  };

  if (isLoading) {
    return <DataLoader context="generic" variant="card" customMessage={t('templates.loading')} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading text-foreground">{t('templates.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('templates.subtitle')}</p>
        </div>
      </div>

      {/* Data Source Disclaimer */}
      <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
            {t('templates.avgElixirReal')}
          </span>
          <span className="px-2 py-0.5 rounded bg-warning/20 text-warning border border-warning/30">
            {t('templates.difficultyEstimated')}
          </span>
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            {t('templates.popularityAdmin')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('templates.winRateNote')}
        </p>
      </div>

      <Tabs value={selectedArchetype} onValueChange={setSelectedArchetype}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          {archetypes.map((arch) => (
            <TabsTrigger 
              key={arch} 
              value={arch} 
              className="capitalize flex items-center gap-1"
              disabled={arch === "recommended" && recommendedDecks.length === 0}
            >
              {arch === "recommended" && <Star className="h-3 w-3" />}
              {arch === "recommended" ? t('templates.recommended') : arch}
              {arch === "recommended" && recommendedDecks.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {recommendedDecks.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedArchetype} className="space-y-4 mt-4">
          {/* Recommended Tab Info */}
          {effectiveArchetype === "recommended" && recommendedDecks.length > 0 && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-start gap-3">
              <Star className="h-5 w-5 text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">{t('templates.recommendedForYou')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('templates.recommendedDesc', { level: t(`templates.difficulty.${skillLevel}`) })}
                </p>
              </div>
            </div>
          )}

          {/* No Recommendations Message */}
          {effectiveArchetype === "recommended" && recommendedDecks.length === 0 && userCollection.length === 0 && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
              <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('templates.noRecommendations')}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {filteredTemplates?.map((template) => {
              const isRecommended = recommendedDecks.some(r => r.id === template.id);
              
              return (
                <Card key={template.id} className={`hover:shadow-glow transition-all ${isRecommended ? 'ring-2 ring-success/50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {isRecommended && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="default" className="bg-success hover:bg-success/90 gap-1">
                                    <Star className="h-3 w-3" />
                                    {t('templates.recommendedBadge')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('templates.recommendedTooltip')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
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
                        {t(`templates.difficulty.${template.difficulty}`)}
                      </span>
                      <Button
                        onClick={() => handleImport(template)}
                        variant="default"
                        size="sm"
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        {t('templates.import')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
