import { useTranslation } from "react-i18next";
import { ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { nextUpgradeCopies } from "@/lib/upgradeCost";
import type { CardCollectionRow } from "@/types/dashboard.types";
import { calculateDisplayLevel } from "@/utils/cardLevelCalculator";
import { CardImage } from "./CardImage";

const RARITY_COLORS = {
  common: "bg-gray-500",
  rare: "bg-orange-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
  champion: "bg-pink-500"
} as const;

export function CollectionCard({ card }: { card: CardCollectionRow }) {
  const { t } = useTranslation();
  const { displayLevel, isMaxLevel } = calculateDisplayLevel({ level: card.card_level, maxLevel: card.max_level });
  const required = nextUpgradeCopies(card);
  const owned = card.card_count;
  const missing = required != null && owned != null ? Math.max(0, required - owned) : null;
  const rarity = card.rarity.toLowerCase();
  const color = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS];

  return (
    <div className="space-y-2">
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
          <Badge variant="outline" className={`text-xs ${color}/10 border-${color}/20`}>
            {t(`landing.demo.cards.rarities.${rarity}`, { defaultValue: card.rarity })}
          </Badge>
          {!isMaxLevel && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUp className="w-3 h-3" />
              <span>{owned ?? "—"}/{required ?? "—"}</span>
            </div>
          )}
        </div>
        {isMaxLevel ? (
          <Badge variant="default" className="w-full justify-center bg-green-500 hover:bg-green-600">
            {t('cardCollection.max')}
          </Badge>
        ) : (
          <div className="space-y-1">
            {missing !== null && <Progress value={Math.min(100, owned / required * 100)} className="h-1.5" />}
            <p className="text-xs text-center text-muted-foreground">
              {displayLevel === null ? t('cardCollection.unknownLevel')
                : required === null ? t('correctness.unknownCost')
                : missing === null ? t('cardCollection.unknownCopies')
                : t('cardCollection.cardsUntilLevel', { count: missing, level: displayLevel + 1 })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
