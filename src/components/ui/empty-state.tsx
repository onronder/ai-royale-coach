import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "compact" | "card";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const isCompact = variant === "compact";
  const isCard = variant === "card";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        isCompact && "py-8",
        isCard && "bg-card/30 border border-border/50 rounded-lg backdrop-blur-sm",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-primary/10 p-6 mb-4 animate-pulse-glow",
          isCompact && "p-4 mb-3"
        )}
      >
        <Icon
          className={cn(
            "text-primary",
            isCompact ? "w-8 h-8" : "w-12 h-12"
          )}
        />
      </div>

      <h3
        className={cn(
          "font-rajdhani font-bold text-foreground mb-2",
          isCompact ? "text-lg" : "text-2xl"
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          "text-muted-foreground max-w-md mb-6",
          isCompact ? "text-sm mb-4" : "text-base"
        )}
      >
        {description}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          size={isCompact ? "sm" : "default"}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
