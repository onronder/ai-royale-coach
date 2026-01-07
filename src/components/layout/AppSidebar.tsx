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
  onTabChange: (value: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems = [
    { id: "coach", label: t("dashboard.tabs.coach"), icon: Brain },
    { id: "deck", label: t("dashboard.tabs.deck"), icon: Swords },
    { id: "stats", label: t("dashboard.tabs.stats"), icon: BarChart3 },
    { id: "social", label: t("dashboard.tabs.social"), icon: Users },
  ];

  return (
    <Sidebar variant="floating" collapsible="icon" className="hidden md:flex">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
            <Crown className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="font-rajdhani font-bold text-lg tracking-wider text-primary">
              AI COACH
            </span>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-black/40 backdrop-blur-md">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "transition-all duration-200",
                        isActive && "bg-primary/10 text-primary border-l-2 border-primary"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "font-rajdhani font-semibold uppercase tracking-wide",
                        isActive && "text-primary"
                      )}>
                        {item.label}
                      </span>
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
