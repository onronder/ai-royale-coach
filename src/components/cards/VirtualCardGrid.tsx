import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CardImage } from "./CardImage";
import { ArrowUp } from "lucide-react";
import { getDisplayLevel } from "@/utils/cardLevelCalculator";

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
  evolution_level: number | null;
}

interface VirtualCardGridProps {
  cards: CardCollectionItem[];
  calculateProgress: (card: CardCollectionItem) => number;
  getNextLevelRequirement: (card: CardCollectionItem) => number | null;
  columns?: number;
}

const RARITY_COLORS = {
  common: "bg-gray-500",
  rare: "bg-orange-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
  champion: "bg-pink-500"
};

export function VirtualCardGrid({ 
  cards, 
  calculateProgress, 
  getNextLevelRequirement,
  columns = 5 
}: VirtualCardGridProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Calculate rows based on columns
  const rows = Math.ceil(cards.length / columns);
  
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated row height
    overscan: 3,
  });

  if (cards.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t('cardCollection.noCardsFound')}
      </p>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columns;
          const rowCards = cards.slice(rowStartIndex, rowStartIndex + columns);
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-3">
                {rowCards.map((card) => {
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
                            evolutionLevel: card.evolution_level || undefined,
                            rarity: card.rarity,
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
                          {!isMaxLevel && nextLevelReq && (
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
                              {nextLevelReq! - card.card_count} {t('cardCollection.toLevel')} {getDisplayLevel({ level: card.card_level + 1, maxLevel: card.max_level, rarity: card.rarity })}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="default" className="w-full justify-center bg-green-500 hover:bg-green-600">
                            {t('cardCollection.max')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
