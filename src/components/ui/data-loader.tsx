import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Loader2, Swords, Target, Trophy, Sparkles, Users, TrendingUp, Award, Database, RefreshCw, Crown, Zap, Shield, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type LoaderContext = 
  | "player"
  | "player-profiles"
  | "battles"
  | "deck"
  | "deck-analysis"
  | "collection"
  | "mastery"
  | "analytics"
  | "leaderboard"
  | "tournaments"
  | "tournament-detail"
  | "tournament-bracket"
  | "clans"
  | "achievements"
  | "coach"
  | "syncing"
  | "notifications"
  | "match-analysis"
  | "replacements"
  | "generic";

interface DataLoaderProps {
  context?: LoaderContext;
  customMessage?: string;
  variant?: "inline" | "card" | "minimal";
  className?: string;
}

const contextConfig: Record<LoaderContext, { icon: typeof Loader2; translationKey: string; color: string }> = {
  player: {
    icon: Crown,
    translationKey: "dataLoader.player",
    color: "text-primary"
  },
  "player-profiles": {
    icon: Users,
    translationKey: "dataLoader.playerProfiles",
    color: "text-primary"
  },
  battles: {
    icon: Swords,
    translationKey: "dataLoader.battles",
    color: "text-chart-1"
  },
  deck: {
    icon: Target,
    translationKey: "dataLoader.deck",
    color: "text-accent"
  },
  "deck-analysis": {
    icon: Sparkles,
    translationKey: "dataLoader.deckAnalysis",
    color: "text-primary"
  },
  collection: {
    icon: PackageOpen,
    translationKey: "dataLoader.collection",
    color: "text-chart-2"
  },
  mastery: {
    icon: Zap,
    translationKey: "dataLoader.mastery",
    color: "text-accent"
  },
  analytics: {
    icon: TrendingUp,
    translationKey: "dataLoader.analytics",
    color: "text-chart-4"
  },
  leaderboard: {
    icon: Trophy,
    translationKey: "dataLoader.leaderboard",
    color: "text-gold"
  },
  tournaments: {
    icon: Award,
    translationKey: "dataLoader.tournaments",
    color: "text-primary"
  },
  clans: {
    icon: Users,
    translationKey: "dataLoader.clans",
    color: "text-chart-3"
  },
  achievements: {
    icon: Shield,
    translationKey: "dataLoader.achievements",
    color: "text-accent"
  },
  coach: {
    icon: Sparkles,
    translationKey: "dataLoader.coach",
    color: "text-primary"
  },
  syncing: {
    icon: RefreshCw,
    translationKey: "dataLoader.syncing",
    color: "text-accent"
  },
  notifications: {
    icon: Award,
    translationKey: "dataLoader.notifications",
    color: "text-primary"
  },
  "tournament-detail": {
    icon: Trophy,
    translationKey: "dataLoader.tournamentDetail",
    color: "text-gold"
  },
  "tournament-bracket": {
    icon: Swords,
    translationKey: "dataLoader.tournamentBracket",
    color: "text-primary"
  },
  "match-analysis": {
    icon: Sparkles,
    translationKey: "dataLoader.matchAnalysis",
    color: "text-accent"
  },
  replacements: {
    icon: Zap,
    translationKey: "dataLoader.replacements",
    color: "text-chart-2"
  },
  generic: {
    icon: Database,
    translationKey: "dataLoader.generic",
    color: "text-muted-foreground"
  }
};

export function DataLoader({ 
  context = "generic",
  customMessage,
  variant = "card",
  className 
}: DataLoaderProps) {
  const { t } = useTranslation();
  const config = contextConfig[context];
  const Icon = config.icon;
  const message = customMessage || t(config.translationKey);

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
          <span className="text-xs text-muted-foreground">{t('common.pleaseWait')}</span>
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
          <p className="text-sm text-muted-foreground">{t('common.thisMayTakeMoment')}</p>
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
  return contextConfig[context]?.translationKey || "dataLoader.generic";
}
