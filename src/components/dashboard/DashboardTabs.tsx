import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Swords, BarChart3, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DashboardTabs() {
  const { t } = useTranslation();
  
  const tabs = [
    { value: "coach", label: t("dashboard.tabs.coach"), icon: Brain },
    { value: "deck", label: t("dashboard.tabs.deck"), icon: Swords },
    { value: "stats", label: t("dashboard.tabs.stats"), icon: BarChart3 },
    { value: "social", label: t("dashboard.tabs.social"), icon: Users },
  ];

  return (
    <TabsList className="hidden md:grid w-full grid-cols-4 gap-2 h-auto p-2 bg-card/80 border border-gold/20 rounded-xl backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex flex-col items-center justify-center gap-1 h-20 rounded-lg font-rajdhani font-bold text-sm data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all"
          >
            <Icon className="h-6 w-6" />
            <span>{tab.label}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
