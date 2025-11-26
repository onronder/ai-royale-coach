import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { CardImage } from "./CardImage";
import { Zap } from "lucide-react";

interface DeckGridProps {
  cards: ClashRoyaleCard[];
  showElixir?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DeckGrid({ cards, showElixir = true, size = 'md' }: DeckGridProps) {
  const avgElixir = cards.reduce((sum, card) => sum + (card.elixirCost || 0), 0) / cards.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {cards.slice(0, 8).map((card, idx) => (
          <CardImage
            key={`${card.id}-${idx}`}
            card={card}
            size={size}
            showLevel={true}
            showElixir={showElixir}
          />
        ))}
      </div>
      
      {showElixir && avgElixir > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="w-4 h-4 text-primary" />
          <span>Average Elixir: <span className="font-semibold text-foreground">{avgElixir.toFixed(1)}</span></span>
        </div>
      )}
    </div>
  );
}
