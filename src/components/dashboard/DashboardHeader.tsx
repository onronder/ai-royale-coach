import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Trophy, Swords, Crown } from "lucide-react";
import { CacheStatusIndicator } from "@/components/analytics/CacheStatusIndicator";
import { QuickAccountSwitch } from "@/components/player/QuickAccountSwitch";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { GlobalProgressCenter } from "@/components/layout/GlobalProgressCenter";
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
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo (mobile only) + Player Stats */}
        <div className="flex items-center gap-4">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2">
            <Crown className="h-6 w-6 text-gold" />
            <span className="font-rajdhani font-bold text-foreground">AI ROYALE</span>
          </div>
          
          {/* Quick Stats (desktop) */}
          {player && (
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/20">
                <Trophy className="h-3.5 w-3.5 text-gold" />
                <span className="text-sm font-rajdhani font-bold text-gold">
                  {player.trophies.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/10 border border-success/20">
                <Swords className="h-3.5 w-3.5 text-success" />
                <span className="text-sm font-rajdhani font-bold text-success">
                  {winRate.toFixed(0)}% {t("dashboard.header.winRate")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <CacheStatusIndicator 
            playerTag={playerTag} 
            onRefresh={onRefresh} 
            isRefreshing={isRefreshing} 
          />
          <GlobalProgressCenter />
          <NotificationCenter />
          <div className="hidden sm:flex items-center gap-1">
            <LanguageSelector />
            <ThemeToggle />
          </div>
          <QuickAccountSwitch
            currentPlayerTag={playerTag} 
            userId={userId} 
          />
        </div>
      </div>
    </header>
  );
}
