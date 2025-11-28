import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { CardImage } from "./CardImage";
import { Zap, PackageOpen } from "lucide-react";
import { GameTooltip, statTooltips } from "@/components/ui/tooltip-helpers";
import { EmptyState } from "@/components/ui/empty-state";

interface DeckGridProps {
  cards: ClashRoyaleCard[];
  showElixir?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Memoized to prevent re-renders when deck hasn't changed
export const DeckGrid = memo(function DeckGrid({ cards, showElixir = true, size = 'md' }: DeckGridProps) {
  const { t } = useTranslation();
  
  // Memoize expensive calculation
  const avgElixir = useMemo(() => 
    cards.reduce((sum, card) => sum + (card.elixirCost || 0), 0) / cards.length,
    [cards]
  );

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={t('deck.noCards')}
        description={t('deck.noCardsDescription')}
        variant="compact"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {cards.slice(0, 8).map((card, idx) => (
          <div 
            key={`${card.id}-${idx}`}
            className="animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <CardImage
              card={card}
              size={size}
              showLevel={true}
              showElixir={showElixir}
            />
          </div>
        ))}
      </div>
      
      {showElixir && avgElixir > 0 && (
        <GameTooltip content={<p className="text-sm">{statTooltips.avgElixir}</p>}>
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 cursor-help">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-rajdhani font-semibold text-foreground">
              {t('deck.avgElixir')}: <span className="text-primary text-lg">{avgElixir.toFixed(1)}</span>
            </span>
          </div>
        </GameTooltip>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if cards array actually changes
  if (prevProps.cards.length !== nextProps.cards.length) return false;
  if (prevProps.showElixir !== nextProps.showElixir) return false;
  if (prevProps.size !== nextProps.size) return false;
  
  // Check if card IDs are the same
  for (let i = 0; i < prevProps.cards.length; i++) {
    if (prevProps.cards[i].id !== nextProps.cards[i].id) return false;
  }
  return true;
});
