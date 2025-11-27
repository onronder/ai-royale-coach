import { cn } from "@/lib/utils";
import { Loader2, Swords, Target, Trophy, Sparkles, Users, TrendingUp, Award, Database, RefreshCw, Crown, Zap, Shield, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type LoaderContext = 
  | "player"
  | "battles"
  | "deck"
  | "deck-analysis"
  | "collection"
  | "mastery"
  | "analytics"
  | "leaderboard"
  | "tournaments"
  | "clans"
  | "achievements"
  | "coach"
  | "syncing"
  | "generic";

interface DataLoaderProps {
  context?: LoaderContext;
  customMessage?: string;
  variant?: "inline" | "card" | "minimal";
  className?: string;
}

const contextConfig: Record<LoaderContext, { icon: typeof Loader2; message: string; color: string }> = {
  player: {
    icon: Crown,
    message: "Loading player profile...",
    color: "text-primary"
  },
  battles: {
    icon: Swords,
    message: "Fetching battle history...",
    color: "text-chart-1"
  },
  deck: {
    icon: Target,
    message: "Loading current deck...",
    color: "text-accent"
  },
  "deck-analysis": {
    icon: Sparkles,
    message: "AI analyzing deck strategy...",
    color: "text-primary"
  },
  collection: {
    icon: PackageOpen,
    message: "Loading card collection...",
    color: "text-chart-2"
  },
  mastery: {
    icon: Zap,
    message: "Calculating card mastery levels...",
    color: "text-accent"
  },
  analytics: {
    icon: TrendingUp,
    message: "Processing deck statistics...",
    color: "text-chart-4"
  },
  leaderboard: {
    icon: Trophy,
    message: "Fetching global rankings...",
    color: "text-gold"
  },
  tournaments: {
    icon: Award,
    message: "Loading tournament data...",
    color: "text-primary"
  },
  clans: {
    icon: Users,
    message: "Searching clans...",
    color: "text-chart-3"
  },
  achievements: {
    icon: Shield,
    message: "Loading achievements...",
    color: "text-accent"
  },
  coach: {
    icon: Sparkles,
    message: "AI Coach is thinking...",
    color: "text-primary"
  },
  syncing: {
    icon: RefreshCw,
    message: "Syncing with Clash Royale servers...",
    color: "text-accent"
  },
  generic: {
    icon: Database,
    message: "Loading data...",
    color: "text-muted-foreground"
  }
};

export function DataLoader({ 
  context = "generic",
  customMessage,
  variant = "card",
  className 
}: DataLoaderProps) {
  const config = contextConfig[context];
  const Icon = config.icon;
  const message = customMessage || config.message;

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className={cn("h-4 w-4 animate-spin", config.color)} />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center gap-3 py-8", className)}>
        <div className="relative">
          <Icon className={cn("h-6 w-6 animate-pulse", config.color)} />
          <div className={cn("absolute inset-0 rounded-full blur-md animate-pulse opacity-50", config.color.replace("text-", "bg-"))} />
        </div>
        <div className="flex flex-col">
          <span className="font-rajdhani font-semibold text-foreground">{message}</span>
          <span className="text-xs text-muted-foreground">Please wait...</span>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <Card className={cn("border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="relative">
          <Icon className={cn("h-12 w-12 animate-float", config.color)} />
          <div className={cn("absolute inset-0 rounded-full blur-xl animate-pulse-glow opacity-30", config.color.replace("text-", "bg-"))} />
        </div>
        <div className="text-center space-y-1">
          <p className="font-rajdhani font-semibold text-lg text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}

// Export a helper for showing refresh status in toasts
export function getRefreshMessage(context: LoaderContext): string {
  return contextConfig[context]?.message || "Loading...";
}
