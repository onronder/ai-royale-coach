import { cn } from "@/lib/utils";
import { Loader2, Sparkles, Crown, Zap, Shield } from "lucide-react";

interface AnalysisLoaderProps {
  message?: string;
  variant?: "compact" | "card" | "fullscreen" | "overlay";
  icon?: "sparkles" | "crown" | "zap" | "shield";
  showProgress?: boolean;
  className?: string;
}

const iconMap = {
  sparkles: Sparkles,
  crown: Crown,
  zap: Zap,
  shield: Shield,
};

export function AnalysisLoader({ 
  message = "Loading...",
  variant = "card",
  icon = "sparkles",
  showProgress = false,
  className 
}: AnalysisLoaderProps) {
  const Icon = iconMap[icon];
  
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8 shadow-elegant">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Icon className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            </div>
            <p className="text-lg font-heading text-foreground">{message}</p>
            {showProgress && (
              <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-md mx-auto p-8">
          <div className="relative">
            <Icon className="h-16 w-16 text-primary animate-float" />
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse-glow" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-heading text-foreground">{message}</h3>
            {showProgress && (
              <div className="w-80 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
              </div>
            )}
            <p className="text-muted-foreground">Please wait while we process your request</p>
          </div>
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <div className={cn("bg-card border border-border rounded-lg p-6 shadow-sm", className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Icon className="h-10 w-10 text-primary animate-pulse" />
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-heading text-foreground">{message}</p>
          {showProgress && (
            <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
