import { Brain, Swords, Users, Fingerprint } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onDnaClick?: () => void;
}

export function MobileBottomNav({ activeTab, onTabChange, onDnaClick }: MobileBottomNavProps) {
  const { t, ready } = useTranslation();
  
  // Show skeleton while translations are loading
  if (!ready) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-gold/20 md:hidden safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-0.5">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-2 w-8 bg-muted rounded animate-pulse mt-1" />
            </div>
          ))}
        </div>
      </nav>
    );
  }
  
  const tabs = [
    { value: "coach", label: t("dashboard.tabs.coach"), icon: Brain },
    { value: "deck", label: t("dashboard.tabs.deck"), icon: Swords },
    { value: "dna", label: "DNA", icon: Fingerprint, action: onDnaClick },
    { value: "social", label: t("dashboard.tabs.social"), icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-gold/20 md:hidden safe-area-bottom">
      <div className="grid grid-cols-4 min-h-[56px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          const isDnaTab = tab.value === "dna";
          return (
            <button
              key={tab.value}
              onClick={() => {
                if (isDnaTab && tab.action) {
                  tab.action();
                } else {
                  onTabChange(tab.value);
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 transition-all min-h-[44px] active:scale-95",
                isDnaTab 
                  ? "text-gold hover:text-gold/80" 
                  : isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110",
                isDnaTab && "text-gold"
              )} />
              <span className={cn(
                "text-[10px] font-rajdhani font-semibold uppercase tracking-wide",
                isDnaTab ? "text-gold" : isActive && "text-primary"
              )}>
                {tab.label}
              </span>
              {isActive && !isDnaTab && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
