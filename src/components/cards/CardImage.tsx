import { useState } from "react";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

export function CardImage({ 
  card, 
  size = 'md', 
  showLevel = true,
  showElixir = false,
  className 
}: CardImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden bg-card border-2 transition-all hover:-translate-y-1 group",
      sizeClasses[size],
      rarityColors[rarity as keyof typeof rarityColors],
      rarityGlow[rarity as keyof typeof rarityGlow],
      className
    )}>
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
        <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs font-bold font-rajdhani rounded px-2 py-0.5 shadow-glow">
          {card.level}
        </div>
      )}

      {showElixir && card.elixirCost !== undefined && (
        <div className="absolute top-1 left-1 bg-gradient-primary text-primary-foreground text-xs font-bold font-rajdhani rounded-full w-7 h-7 flex items-center justify-center shadow-glow">
          {card.elixirCost}
        </div>
      )}

      {card.evolutionLevel && (
        <div className="absolute top-1 right-1 bg-gradient-legendary text-primary-foreground text-xs font-bold font-rajdhani rounded px-2 py-0.5 animate-pulse-glow">
          EVO
        </div>
      )}
    </div>
  );
}
