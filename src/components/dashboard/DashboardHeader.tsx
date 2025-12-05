import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Trophy, Swords, Crown, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CacheStatusIndicator } from "@/components/analytics/CacheStatusIndicator";
import { QuickAccountSwitch } from "@/components/player/QuickAccountSwitch";
import { ClashRoyalePlayer } from "@/services/clashRoyaleApi";

interface DashboardHeaderProps {
  playerTag: string;
  player: ClashRoyalePlayer | null;
  winRate: number;
  userId: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}

export function DashboardHeader({
  playerTag,
  player,
  winRate,
  userId,
  isRefreshing,
  onRefresh,
  onSignOut,
}: DashboardHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-card/90 backdrop-blur-md shadow-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Crown className="h-7 w-7 text-gold" />
            <div className="absolute inset-0 bg-gold/20 blur-lg -z-10" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-rajdhani text-foreground">AI ROYALE</h1>
            <p className="text-xs text-muted-foreground font-mono">#{playerTag}</p>
          </div>
        </div>
        
        {/* Quick Stats */}
        {player && (
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20">
              <Trophy className="h-4 w-4 text-gold trophy-shimmer" />
              <span className="font-rajdhani font-bold text-gold">{player.trophies.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
              <Swords className="h-4 w-4 text-success" />
              <span className="font-rajdhani font-bold text-success">
                {winRate.toFixed(0)}% WR
              </span>
            </div>
          </div>
        )}

        {/* Quick Switch & Sign Out */}
        <div className="flex items-center gap-2">
          <CacheStatusIndicator 
            playerTag={playerTag} 
            onRefresh={onRefresh} 
            isRefreshing={isRefreshing} 
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/help')}
                className="text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('nav.help')}</TooltipContent>
          </Tooltip>
          <QuickAccountSwitch 
            currentPlayerTag={playerTag} 
            userId={userId} 
          />
          <Button variant="outline" size="sm" onClick={onSignOut} className="border-border/50 hover:border-destructive/50 hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.signOut')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
