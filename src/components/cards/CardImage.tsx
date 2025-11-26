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

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-card border border-border", sizeClasses[size], className)}>
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
            "w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {showLevel && (
        <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs font-bold rounded px-1.5 py-0.5">
          {card.level}
        </div>
      )}

      {showElixir && card.elixirCost !== undefined && (
        <div className="absolute top-1 left-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {card.elixirCost}
        </div>
      )}

      {card.evolutionLevel && (
        <div className="absolute top-1 right-1 bg-accent text-accent-foreground text-xs font-bold rounded px-1 py-0.5">
          EVO
        </div>
      )}
    </div>
  );
}
