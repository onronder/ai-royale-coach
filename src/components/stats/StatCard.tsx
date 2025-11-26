import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'gradient' | 'glow';
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  variant = 'default',
  className 
}: StatCardProps) {
  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  const variantStyles = {
    default: 'bg-card border-border hover:shadow-md',
    gradient: 'bg-gradient-primary text-primary-foreground border-primary/30 hover:shadow-primary-glow',
    glow: 'bg-card-elevated border-primary/20 hover:shadow-glow hover:border-primary/40'
  };

  return (
    <Card className={cn(
      "transition-all hover:-translate-y-1 duration-300",
      variantStyles[variant],
      className
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className={cn(
              "text-sm font-medium font-rajdhani uppercase tracking-wide",
              variant === 'gradient' ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {title}
            </p>
            <p className={cn(
              "text-3xl font-bold font-rajdhani",
              variant === 'gradient' ? 'text-primary-foreground' : trend && trendColors[trend]
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
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            variant === 'gradient' ? 'bg-primary-foreground/10' : 'bg-primary/10'
          )}>
            <Icon className={cn(
              "w-6 h-6",
              variant === 'gradient' ? 'text-primary-foreground' : 'text-primary'
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
