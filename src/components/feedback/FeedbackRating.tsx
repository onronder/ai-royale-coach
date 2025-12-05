import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface FeedbackRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function FeedbackRating({
  value,
  onChange,
  disabled = false,
  size = "default",
  className
}: FeedbackRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const gapClasses = {
    sm: "gap-0.5",
    default: "gap-1",
    lg: "gap-1.5"
  };

  return (
    <div 
      className={cn("flex items-center", gapClasses[size], className)}
      onMouseLeave={() => setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverValue || value);
        
        return (
          <motion.button
            key={star}
            type="button"
            disabled={disabled}
            className={cn(
              "transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 rounded",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onClick={() => !disabled && onChange(star)}
            whileHover={{ scale: disabled ? 1 : 1.2 }}
            whileTap={{ scale: disabled ? 1 : 0.9 }}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
