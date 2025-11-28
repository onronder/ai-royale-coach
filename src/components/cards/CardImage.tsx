import { useState, memo } from "react";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { GameTooltip, rarityTooltips } from "@/components/ui/tooltip-helpers";
import { calculateDisplayLevel } from "@/utils/cardLevelCalculator";

interface CardImageProps {
  card: ClashRoyaleCard;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  showElixir?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-20',
  md: 'w-20 h-28',
  lg: 'w-28 h-36'
};

// Memoized to prevent re-renders in large card grids
export const CardImage = memo(function CardImage({ 
  card, 
  size = 'md', 
  showLevel = true,
  showElixir = false,
  className 
}: CardImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use centralized card level calculator for accurate in-game display levels
  const levelResult = calculateDisplayLevel({
    level: card.level,
    maxLevel: card.maxLevel,
    evolutionLevel: card.evolutionLevel,
    rarity: card.rarity,
  });
  const displayLevel = levelResult.displayLevel;

  const rarityColors = {
    common: 'border-border',
    rare: 'border-accent/50',
    epic: 'border-primary/50',
    legendary: 'border-[hsl(280_80%_60%)]',
    champion: 'border-gold'
  };

  const rarityGlow = {
    common: '',
    rare: 'hover:shadow-accent-glow',
    epic: 'hover:shadow-glow',
    legendary: 'hover:shadow-[0_0_20px_hsl(280_80%_60%/0.4)]',
    champion: 'hover:shadow-[0_0_20px_hsl(45_100%_55%/0.4)]'
  };

  const rarity = card.rarity?.toLowerCase() || 'common';

  const isEvolved = levelResult.isEvolved;

  const cardContent = (
    <div className={cn(
      "relative rounded-lg overflow-hidden bg-card border-2 transition-all hover:-translate-y-1 group",
      sizeClasses[size],
      // Evolution glow effect overrides rarity styling
      isEvolved 
        ? "border-[hsl(45_100%_55%)] shadow-[0_0_16px_hsl(45_100%_55%/0.5),inset_0_0_8px_hsl(45_100%_55%/0.1)] hover:shadow-[0_0_24px_hsl(45_100%_55%/0.7)]" 
        : cn(rarityColors[rarity as keyof typeof rarityColors], rarityGlow[rarity as keyof typeof rarityGlow]),
      className
    )}>
      {/* Evolution glow ring animation */}
      {isEvolved && (
        <div className="absolute inset-0 rounded-lg pointer-events-none animate-pulse opacity-60">
          <div className="absolute inset-0 rounded-lg border-2 border-[hsl(45_100%_55%/0.6)]" />
        </div>
      )}

      {!imageLoaded && !imageError && (
        <Skeleton className="absolute inset-0" />
      )}
      
      {imageError ? (
        <div className="absolute inset-0 flex items-center justify-center p-2 bg-muted">
          <p className="text-xs text-center font-medium text-muted-foreground">{card.name}</p>
        </div>
      ) : (
        <img
          src={card.iconUrls.medium}
          alt={card.name}
          loading="lazy"
          className={cn(
            "w-full h-full object-cover transition-all duration-300 group-hover:scale-105",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {showLevel && (
        <div className={cn(
          "absolute bottom-1 right-1 text-xs font-bold font-rajdhani rounded px-2 py-0.5",
          isEvolved 
            ? "bg-gradient-to-r from-[hsl(45_100%_45%)] to-[hsl(35_100%_50%)] text-background shadow-[0_0_10px_hsl(45_100%_55%/0.6)]" 
            : "bg-primary text-primary-foreground shadow-glow"
        )}>
          {displayLevel}
        </div>
      )}

      {showElixir && card.elixirCost !== undefined && (
        <div className="absolute top-1 left-1 bg-gradient-primary text-primary-foreground text-xs font-bold font-rajdhani rounded-full w-7 h-7 flex items-center justify-center shadow-glow">
          {card.elixirCost}
        </div>
      )}

      {isEvolved && (
        <div className="absolute top-1 right-1 bg-gradient-to-r from-[hsl(45_100%_45%)] to-[hsl(35_100%_50%)] text-background text-xs font-bold font-rajdhani rounded px-1.5 py-0.5 shadow-[0_0_12px_hsl(45_100%_55%/0.8)] flex items-center gap-0.5">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          EVO
        </div>
      )}
    </div>
  );

  return (
    <GameTooltip
      content={
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-rajdhani font-bold text-base">{card.name}</p>
            {isEvolved && (
              <span className="text-xs font-bold text-[hsl(45_100%_55%)] bg-[hsl(45_100%_55%/0.15)] px-1.5 py-0.5 rounded">
                EVOLVED
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {rarity} • {card.elixirCost} Elixir • Level {displayLevel}
          </p>
          {isEvolved && (
            <p className="text-xs text-[hsl(45_100%_55%)] border-t border-border pt-2">
              ✨ Evolution unlocked - gains special abilities in battle
            </p>
          )}
          {card.rarity && !isEvolved && (
            <p className="text-xs text-primary/80 border-t border-border pt-2">
              {rarityTooltips[rarity as keyof typeof rarityTooltips]}
            </p>
          )}
        </div>
      }
    >
      {cardContent}
    </GameTooltip>
  );
}, (prevProps, nextProps) => {
  // Only re-render if card data actually changes
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.level === nextProps.card.level &&
    prevProps.card.evolutionLevel === nextProps.card.evolutionLevel &&
    prevProps.size === nextProps.size &&
    prevProps.showLevel === nextProps.showLevel &&
    prevProps.showElixir === nextProps.showElixir
  );
});
