import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, 
  TrendingUp, 
  Settings, 
  RefreshCw, 
  LogOut,
  HelpCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { GlobalProgressCenter } from "@/components/layout/GlobalProgressCenter";
import { ClashRoyalePlayer } from "@/services/clashRoyaleApi";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  playerTag: string;
  player: ClashRoyalePlayer | null;
  winRate: number;
  userId: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
  lastUpdated?: Date | null;
  onOpenHelp?: () => void;
  onOpenSettings?: () => void;
}

export function DashboardHeader({
  playerTag,
  player,
  winRate,
  userId,
  isRefreshing,
  onRefresh,
  onSignOut,
  lastUpdated,
  onOpenHelp,
  onOpenSettings,
}: DashboardHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [controlPanelOpen, setControlPanelOpen] = useState(false);

  // Calculate time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t("dashboard.header.justNow", "Just now");
    if (diffMins < 60) return t("dashboard.header.minsAgo", "{{count}} min ago", { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    return t("dashboard.header.hoursAgo", "{{count}}h ago", { count: diffHours });
  };

  const handleSettingsClick = () => {
    setControlPanelOpen(false);
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      navigate("/settings");
    }
  };

  const handleHelpClick = () => {
    setControlPanelOpen(false);
    if (onOpenHelp) {
      onOpenHelp();
    }
  };

  const handleSignOut = () => {
    setControlPanelOpen(false);
    onSignOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top">
      <div className="container mx-auto px-3 md:px-4 h-14 flex items-center justify-between gap-2">
        
        {/* Left Section */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Sidebar Trigger (mobile) */}
          <SidebarTrigger className="md:hidden" />
          
          {/* Player Name (desktop only) */}
          {player && (
            <h1 className="hidden md:block font-rajdhani font-bold text-lg text-foreground truncate max-w-[200px]">
              {player.name}
            </h1>
          )}
        </div>

        {/* Center: HUD Stats */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {player && (
            <>
              {/* Trophies Badge - Always visible */}
              <Badge 
                variant="outline" 
                className="bg-gold/10 border-gold/30 text-gold gap-1.5 px-2.5 py-1 font-rajdhani font-bold"
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>{player.trophies.toLocaleString()}</span>
              </Badge>
              
              {/* Win Rate Badge - Hidden on very small screens */}
              <Badge 
                variant="outline" 
                className="hidden min-[350px]:flex bg-success/10 border-success/30 text-success gap-1.5 px-2.5 py-1 font-rajdhani font-bold"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{winRate.toFixed(1)}%</span>
              </Badge>
            </>
          )}
        </div>

        {/* Right: Control Panel & Actions */}
        <div className="flex items-center gap-1">
          <GlobalProgressCenter />
          <NotificationCenter />
          
          {/* Control Panel Popover */}
          <Popover open={controlPanelOpen} onOpenChange={setControlPanelOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-lg"
                aria-label={t("dashboard.header.controlPanel", "Control Panel")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              className="w-72 p-0 bg-popover border-border shadow-xl"
              sideOffset={8}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50">
                <h3 className="font-rajdhani font-bold text-base">
                  {t("dashboard.header.dashboardControls", "Dashboard Controls")}
                </h3>
              </div>
              
              {/* Data Sync Section */}
              <div className="p-4 space-y-3 border-b border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {t("dashboard.header.lastUpdated", "Last updated")}
                  </span>
                  <span className="font-medium">
                    {getTimeSinceUpdate() || t("dashboard.header.unknown", "Unknown")}
                  </span>
                </div>
                
                <Button 
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  {isRefreshing 
                    ? t("dashboard.header.syncing", "Syncing...")
                    : t("dashboard.header.forceRefresh", "Force Refresh")
                  }
                </Button>
              </div>
              
              {/* Quick Links */}
              <div className="p-2 space-y-1 border-b border-border/50">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 h-10"
                  onClick={handleSettingsClick}
                >
                  <Settings className="h-4 w-4" />
                  {t("dashboard.header.settings", "Settings")}
                </Button>
                
                {onOpenHelp && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 h-10"
                    onClick={handleHelpClick}
                  >
                    <HelpCircle className="h-4 w-4" />
                    {t("dashboard.header.help", "Help")}
                  </Button>
                )}
              </div>
              
              {/* Footer: Sign Out */}
              <div className="p-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  {t("dashboard.header.signOut", "Sign Out")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
