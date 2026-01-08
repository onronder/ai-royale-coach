import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameTooltip } from "@/components/ui/tooltip-helpers";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'gradient' | 'glow' | 'arena' | 'golden';
  className?: string;
  tooltip?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  variant = 'default',
  className,
  tooltip
}: StatCardProps) {
  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  const variantStyles = {
    default: 'bg-gradient-to-br from-card via-card to-card/80 border-border/50 hover:shadow-md hover:border-primary/30',
    gradient: 'bg-gradient-primary text-primary-foreground border-primary/30 hover:shadow-primary-glow',
    glow: 'bg-card-elevated border-primary/20 hover:shadow-glow hover:border-primary/40',
    arena: 'bg-gradient-to-br from-card via-card to-background-accent border-gold/20 hover:border-gold/40 hover:shadow-gold/20',
    golden: 'bg-gradient-to-br from-card via-card to-card/80 border-gold/30 hover:shadow-gold animate-golden-pulse',
  };

  const iconContainerStyles = {
    default: 'bg-primary/10',
    gradient: 'bg-primary-foreground/10',
    glow: 'bg-primary/10',
    arena: 'bg-gradient-gold',
    golden: 'bg-gradient-gold shadow-gold/30 shadow-lg',
  };

  const iconStyles = {
    default: 'text-primary',
    gradient: 'text-primary-foreground',
    glow: 'text-primary',
    arena: 'text-gold-foreground',
    golden: 'text-gold-foreground',
  };

  const content = (
    <Card className={cn(
      "transition-all hover:-translate-y-1 duration-300",
      variantStyles[variant],
      className
    )}>
      <CardContent className="pt-4 md:pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className={cn(
              "text-sm font-medium font-rajdhani uppercase tracking-wide",
              variant === 'gradient' ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {title}
            </p>
            <p className={cn(
              "text-2xl md:text-3xl font-bold font-rajdhani",
              variant === 'gradient' ? 'text-primary-foreground' : trend && trendColors[trend],
              (variant === 'arena' || variant === 'golden') && !trend && 'text-foreground'
            )}>
              {value}
            </p>
            {description && (
              <p className={cn(
                "text-xs",
                variant === 'gradient' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                {description}
              </p>
            )}
          </div>
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
            iconContainerStyles[variant]
          )}>
            <Icon className={cn(
              "w-5 h-5 md:w-6 md:h-6",
              iconStyles[variant]
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <GameTooltip content={<p className="text-sm">{tooltip}</p>}>
        {content}
      </GameTooltip>
    );
  }

  return content;
}
