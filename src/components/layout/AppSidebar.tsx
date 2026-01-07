import { Brain, Swords, BarChart3, Users, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (value: string) => void;
}

// Map of sub-tabs for each main tab
const subTabLabels: Record<string, Record<string, string>> = {
  coach: { overview: "Overview", matches: "Matches" },
  deck: { current: "Current", builder: "Builder", collection: "Collection" },
  stats: { analytics: "Analytics", leaderboard: "Leaderboard" },
  social: { clans: "Clans", tournaments: "Tournaments" },
};

export function AppSidebar({ activeTab, activeSubTab, onTabChange }: AppSidebarProps) {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems = [
    { id: "coach", label: t("dashboard.tabs.coach"), icon: Brain, defaultSub: "overview" },
    { id: "deck", label: t("dashboard.tabs.deck"), icon: Swords, defaultSub: "current" },
    { id: "stats", label: t("dashboard.tabs.stats"), icon: BarChart3, defaultSub: "analytics" },
    { id: "social", label: t("dashboard.tabs.social"), icon: Users, defaultSub: "clans" },
  ];

  const getSubTabLabel = (tabId: string): string | null => {
    if (activeTab !== tabId) return null;
    return subTabLabels[tabId]?.[activeSubTab] || null;
  };

  return (
    <Sidebar 
      variant="floating" 
      collapsible="icon" 
      className={cn(
        "hidden md:flex transition-all duration-300 ease-out",
        isCollapsed ? "animate-slide-out-left" : "animate-slide-in-left"
      )}
    >
      <SidebarHeader className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
            <Crown className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className={cn(
            "font-rajdhani font-bold text-lg tracking-wider text-primary transition-all duration-200",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}>
            AI COACH
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-black/40 backdrop-blur-md border-r border-white/10">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const subTabLabel = getSubTabLabel(item.id);
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "transition-all duration-200 group/item relative",
                        isActive && "bg-primary/10 text-primary border-l-2 border-primary"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive ? "text-primary scale-110" : "text-muted-foreground group-hover/item:text-foreground"
                      )} />
                      <div className={cn(
                        "flex flex-col items-start transition-all duration-200",
                        isCollapsed ? "opacity-0 w-0" : "opacity-100"
                      )}>
                        <span className={cn(
                          "font-rajdhani font-semibold uppercase tracking-wide text-sm",
                          isActive && "text-primary"
                        )}>
                          {item.label}
                        </span>
                        {/* Sub-tab indicator badge */}
                        {isActive && subTabLabel && !isCollapsed && (
                          <span className="text-[10px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full mt-0.5 animate-fade-in">
                            {subTabLabel}
                          </span>
                        )}
                      </div>
                      
                      {/* Active indicator dot for collapsed state */}
                      {isActive && isCollapsed && (
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
