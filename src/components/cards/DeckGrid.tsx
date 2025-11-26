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
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-rajdhani font-semibold text-foreground">
            Average Elixir: <span className="text-primary text-lg">{avgElixir.toFixed(1)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
