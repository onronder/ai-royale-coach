import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardImage } from "./CardImage";
import { Sparkles, ArrowUp } from "lucide-react";
import { toast } from "sonner";

interface CardCollectionItem {
  id: string;
  card_id: number;
  card_name: string;
  card_level: number;
  card_count: number;
  max_level: number;
  rarity: string;
  elixir_cost: number | null;
  icon_url: string | null;
}

interface CardCollectionTrackerProps {
  playerTag: string;
  userId: string;
}

const RARITY_COLORS = {
  common: "bg-gray-500",
  rare: "bg-orange-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
  champion: "bg-pink-500"
};

const UPGRADE_REQUIREMENTS: Record<string, number[]> = {
  common: [0, 2, 4, 10, 20, 50, 100, 200, 400, 800, 1600, 3000, 5000, 10000],
  rare: [0, 2, 4, 10, 20, 50, 100, 200, 400, 800, 1600, 3000, 5000],
  epic: [0, 2, 4, 10, 20, 50, 100, 200, 400, 800, 1600],
  legendary: [0, 2, 4, 10, 20, 50, 100, 200, 400],
  champion: [0, 2, 4, 10, 20, 50, 100, 200]
};

export function CardCollectionTracker({ playerTag, userId }: CardCollectionTrackerProps) {
  const [collection, setCollection] = useState<CardCollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRarity, setSelectedRarity] = useState<string>("all");

  useEffect(() => {
    fetchCollection();
    syncCollection();
  }, [playerTag, userId]);

  const fetchCollection = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('card_collection')
      .select('*')
      .eq('player_tag', playerTag)
      .order('rarity')
      .order('card_name');

    if (error) {
      console.error('Error fetching collection:', error);
      toast.error('Failed to load card collection');
    } else if (data) {
      setCollection(data);
    }
    setIsLoading(false);
  };

  const syncCollection = async () => {
    try {
      const { error } = await supabase.functions.invoke('sync-card-collection', {
        body: { playerTag, userId }
      });

      if (error) {
        console.error('Error syncing collection:', error);
      } else {
        // Refetch after sync
        setTimeout(fetchCollection, 1000);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const calculateProgress = (card: CardCollectionItem) => {
    if (card.card_level >= card.max_level) {
      return 100;
    }

    const requirements = UPGRADE_REQUIREMENTS[card.rarity.toLowerCase()] || [];
    const currentLevelReq = requirements[card.card_level] || 0;
    
    if (currentLevelReq === 0) return 0;
    return Math.min((card.card_count / currentLevelReq) * 100, 100);
  };

  const getNextLevelRequirement = (card: CardCollectionItem) => {
    if (card.card_level >= card.max_level) {
      return null;
    }
    const requirements = UPGRADE_REQUIREMENTS[card.rarity.toLowerCase()] || [];
    return requirements[card.card_level] || 0;
  };

  const filteredCards = selectedRarity === "all" 
    ? collection 
    : collection.filter(c => c.rarity.toLowerCase() === selectedRarity);

  const rarityStats = {
    common: collection.filter(c => c.rarity.toLowerCase() === 'common').length,
    rare: collection.filter(c => c.rarity.toLowerCase() === 'rare').length,
    epic: collection.filter(c => c.rarity.toLowerCase() === 'epic').length,
    legendary: collection.filter(c => c.rarity.toLowerCase() === 'legendary').length,
    champion: collection.filter(c => c.rarity.toLowerCase() === 'champion').length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Card Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Card Collection ({collection.length} cards)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rarity Filter Tabs */}
        <Tabs value={selectedRarity} onValueChange={setSelectedRarity}>
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="common">
              Common ({rarityStats.common})
            </TabsTrigger>
            <TabsTrigger value="rare">
              Rare ({rarityStats.rare})
            </TabsTrigger>
            <TabsTrigger value="epic">
              Epic ({rarityStats.epic})
            </TabsTrigger>
            <TabsTrigger value="legendary">
              Leg ({rarityStats.legendary})
            </TabsTrigger>
            <TabsTrigger value="champion">
              Champ ({rarityStats.champion})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredCards.map((card) => {
            const progress = calculateProgress(card);
            const nextLevelReq = getNextLevelRequirement(card);
            const isMaxLevel = card.card_level >= card.max_level;

            return (
              <div key={card.id} className="space-y-2">
                {card.icon_url && (
                  <CardImage
                    card={{
                      id: card.card_id,
                      name: card.card_name,
                      level: card.card_level,
                      maxLevel: card.max_level,
                      iconUrls: { medium: card.icon_url },
                      elixirCost: card.elixir_cost || undefined,
                    }}
                    size="md"
                    showLevel={true}
                    showElixir={true}
                  />
                )}
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${RARITY_COLORS[card.rarity.toLowerCase() as keyof typeof RARITY_COLORS]}/10 border-${RARITY_COLORS[card.rarity.toLowerCase() as keyof typeof RARITY_COLORS]}/20`}
                    >
                      {card.rarity}
                    </Badge>
                    {!isMaxLevel && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowUp className="w-3 h-3" />
                        <span>{card.card_count}/{nextLevelReq}</span>
                      </div>
                    )}
                  </div>

                  {!isMaxLevel ? (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-xs text-center text-muted-foreground">
                        {nextLevelReq! - card.card_count} to level {card.card_level + 1}
                      </p>
                    </div>
                  ) : (
                    <Badge variant="default" className="w-full justify-center bg-green-500 hover:bg-green-600">
                      MAX
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCards.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No cards found for this rarity
          </p>
        )}
      </CardContent>
    </Card>
  );
}
