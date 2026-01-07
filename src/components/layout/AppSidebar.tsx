import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Brain, 
  Swords, 
  BarChart3, 
  Users, 
  Crown, 
  Settings, 
  HelpCircle,
  LogOut,
  ChevronRight,
  Trophy,
  Sparkles,
  Target,
  RefreshCw,
  Database
} from "lucide-react";
import { CacheStatusIndicator } from "@/components/analytics/CacheStatusIndicator";
import { GlobalProgressCenter } from "@/components/layout/GlobalProgressCenter";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NavbarSubscriptionBadge } from "./NavbarSubscriptionBadge";

interface AppSidebarProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (value: string) => void;
  onSubTabChange: (value: string) => void;
  playerTag?: string;
  playerName?: string;
  trophies?: number;
  winRate?: number;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onSignOut?: () => void;
}

// Sub-tabs configuration for each main tab
const tabConfig = {
  coach: {
    icon: Brain,
    subtabs: [
      { id: "overview", labelKey: "dashboard.subtabs.overview" },
      { id: "matches", labelKey: "dashboard.subtabs.matches" },
    ]
  },
  deck: {
    icon: Swords,
    subtabs: [
      { id: "current", labelKey: "dashboard.subtabs.current" },
      { id: "builder", labelKey: "dashboard.subtabs.builder" },
      { id: "collection", labelKey: "dashboard.subtabs.collection" },
    ]
  },
  stats: {
    icon: BarChart3,
    subtabs: [
      { id: "analytics", labelKey: "dashboard.subtabs.analytics" },
      { id: "leaderboard", labelKey: "dashboard.subtabs.leaderboard" },
    ]
  },
  social: {
    icon: Users,
    subtabs: [
      { id: "clans", labelKey: "dashboard.subtabs.clans" },
      { id: "tournaments", labelKey: "dashboard.subtabs.tournaments" },
    ]
  },
};

export function AppSidebar({ 
  activeTab, 
  activeSubTab, 
  onTabChange, 
  onSubTabChange,
  playerTag,
  playerName,
  trophies,
  winRate,
  isRefreshing,
  onRefresh,
  onSignOut
}: AppSidebarProps) {
  const { t, ready } = useTranslation();
  const navigate = useNavigate();
  const { state, isMobile } = useSidebar();

  // Wait for translations to be ready before rendering
  if (!ready) {
    return (
      <Sidebar variant="sidebar" collapsible="icon" className="hidden md:flex border-r border-border/50">
        <SidebarContent className="px-2">
          <div className="animate-pulse space-y-2 p-4">
            <div className="h-10 w-10 rounded-xl bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }
  const isCollapsed = state === "collapsed";

  const mainTabs = [
    { id: "coach", labelKey: "dashboard.tabs.coach" },
    { id: "deck", labelKey: "dashboard.tabs.deck" },
    { id: "stats", labelKey: "dashboard.tabs.stats" },
    { id: "social", labelKey: "dashboard.tabs.social" },
  ];

  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="icon" 
      className="hidden md:flex border-r border-border/50"
    >
      {/* Header - Player Info */}
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold/60 flex items-center justify-center shadow-gold">
              <Crown className="h-5 w-5 text-gold-foreground" />
            </div>
            {!isCollapsed && trophies && (
              <div className="absolute -bottom-1 -right-1 bg-card border border-gold/30 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                <Trophy className="h-2.5 w-2.5 text-gold" />
                <span className="text-[9px] font-bold text-gold">{trophies >= 1000 ? `${(trophies / 1000).toFixed(1)}k` : trophies}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-rajdhani font-bold text-foreground truncate">
                {playerName || "AI ROYALE"}
              </h2>
              {playerTag && (
                <p className="text-xs text-muted-foreground font-mono truncate">
                  #{playerTag}
                </p>
              )}
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-3">
            <NavbarSubscriptionBadge />
          </div>
        )}
      </SidebarHeader>
      
      {/* Main Navigation */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
              {t("sidebar.navigation")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainTabs.map((tab) => {
                const config = tabConfig[tab.id as keyof typeof tabConfig];
                const Icon = config.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <SidebarMenuItem key={tab.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => onTabChange(tab.id)}
                          isActive={isActive}
                          className={cn(
                            "group relative transition-all duration-200",
                            isActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className={cn(
                            "h-5 w-5 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                          {!isCollapsed && (
                            <>
                              <span className={cn(
                                "flex-1 font-medium",
                                isActive && "text-primary"
                              )}>
                                {t(tab.labelKey)}
                              </span>
                              <ChevronRight className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                isActive && "rotate-90 text-primary"
                              )} />
                            </>
                          )}
                          {/* Active indicator */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
                          )}
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          {t(tab.labelKey)}
                        </TooltipContent>
                      )}
                    </Tooltip>
                    
                    {/* Sub-tabs (only shown when expanded and active) */}
                    {!isCollapsed && isActive && (
                      <div className="ml-6 mt-1 mb-2 space-y-0.5 border-l-2 border-border/50 pl-3">
                        {config.subtabs.map((subtab) => (
                          <button
                            key={subtab.id}
                            onClick={() => onSubTabChange(subtab.id)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                              activeSubTab === subtab.id 
                                ? "text-primary bg-primary/5 font-medium" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            {t(subtab.labelKey)}
                          </button>
                        ))}
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Player Stats Section */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
              {t("sidebar.playerStats")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <div className={cn("space-y-2", isCollapsed ? "px-1" : "px-2")}>
              {/* Trophy Badge */}
              {trophies !== undefined && (
                isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center p-2 rounded-lg bg-gold/10 border border-gold/20">
                        <Trophy className="h-4 w-4 text-gold" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {trophies.toLocaleString()} {t("dashboard.trophies")}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/10 border border-gold/20">
                    <Trophy className="h-4 w-4 text-gold" />
                    <span className="font-bold text-gold text-sm">{trophies.toLocaleString()}</span>
                  </div>
                )
              )}
              
              {/* Win Rate Badge */}
              {winRate !== undefined && (
                isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center p-2 rounded-lg bg-success/10 border border-success/20">
                        <Target className="h-4 w-4 text-success" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {winRate.toFixed(0)}% {t("dashboard.winRate")}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
                    <Target className="h-4 w-4 text-success" />
                    <span className="font-bold text-success text-sm">{winRate.toFixed(0)}% WR</span>
                  </div>
                )
              )}
              
              {/* Cache Status & Refresh */}
              {playerTag && onRefresh && (
                isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="flex items-center justify-center p-2 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors w-full disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin")} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {t("cacheStatus.refresh")}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <CacheStatusIndicator
                    playerTag={playerTag}
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing || false}
                  />
                )
              )}
              
              {/* Sync Progress Indicator */}
              {!isCollapsed && <GlobalProgressCenter />}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Quick Actions */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
              {t("sidebar.quickActions")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={() => navigate('/help')}
                      className="group"
                    >
                      <HelpCircle className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                      {!isCollapsed && (
                        <span className="flex-1">{t("nav.help")}</span>
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">{t("nav.help")}</TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={() => navigate(`/settings${playerTag ? `?returnTo=/player/${playerTag}` : ''}`)}
                      className="group"
                    >
                      <Settings className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                      {!isCollapsed && (
                        <span className="flex-1">{t("settings.title")}</span>
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">{t("settings.title")}</TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Footer - Sign Out */}
      <SidebarFooter className="p-3 border-t border-border/50">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onSignOut}
                className="w-full h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("nav.signOut")}</TooltipContent>
          </Tooltip>
        ) : (
          <Button 
            variant="ghost" 
            onClick={onSignOut}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("nav.signOut")}</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
