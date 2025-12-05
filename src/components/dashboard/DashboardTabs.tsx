import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Swords, Target, Wrench, TrendingUp, Sparkles, Award, UserPlus, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Map tab values to Help section IDs
const tabHelpSections: Record<string, string> = {
  overview: "stats",
  matches: "matches",
  deck: "deck",
  builder: "builder",
  analytics: "analytics",
  collection: "collection",
  leaderboard: "leaderboard",
  tournaments: "tournaments",
  clans: "clans",
};

interface TabWithHelpProps {
  value: string;
  icon: React.ReactNode;
  label: string;
  helpDescription: string;
  className?: string;
}

function TabWithHelp({ value, icon, label, helpDescription, className }: TabWithHelpProps) {
  const { t } = useTranslation();
  const helpSection = tabHelpSections[value];
  
  return (
    <div className="relative group">
      <TabsTrigger 
        value={value}
        className={className}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </TabsTrigger>
      
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.open(`/help#${helpSection}`, '_blank');
              }}
              className="absolute -top-1 -right-1 p-0.5 rounded-full bg-muted/80 hover:bg-primary/20 border border-border/50 hover:border-primary/50 transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <Info className="h-3 w-3 text-muted-foreground hover:text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8} className="max-w-[200px] text-xs z-[100]">
            <p>{helpDescription}</p>
            <p className="text-primary mt-1 text-[10px]">{t('common.clickForHelp', 'Click for help')} →</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function DashboardTabs() {
  const { t } = useTranslation();

  const tabs = [
    {
      value: "overview",
      icon: <Trophy className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.stats'),
      helpDescription: t('dashboard.tabHelp.overview'),
      className: "data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
    },
    {
      value: "matches",
      icon: <Swords className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.matches'),
      helpDescription: t('dashboard.tabHelp.matches'),
      className: "data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
    },
    {
      value: "deck",
      icon: <Target className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.deck'),
      helpDescription: t('dashboard.tabHelp.deck'),
      className: "data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
    },
    {
      value: "builder",
      icon: <Wrench className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.builder'),
      helpDescription: t('dashboard.tabHelp.builder'),
      className: "data-[state=active]:bg-gradient-accent data-[state=active]:text-accent-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
    },
    {
      value: "analytics",
      icon: <TrendingUp className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.analytics'),
      helpDescription: t('dashboard.tabHelp.analytics'),
      className: "data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
    },
    {
      value: "collection",
      icon: <Sparkles className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.cards'),
      helpDescription: t('dashboard.tabHelp.collection'),
      className: "data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
    },
    {
      value: "leaderboard",
      icon: <TrendingUp className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.ranks'),
      helpDescription: t('dashboard.tabHelp.leaderboard'),
      className: "data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
    },
    {
      value: "tournaments",
      icon: <Award className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.tourneys'),
      helpDescription: t('dashboard.tabHelp.tournaments'),
      className: "data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
    },
    {
      value: "clans",
      icon: <UserPlus className="mr-1 h-4 w-4" />,
      label: t('dashboard.tabs.clans'),
      helpDescription: t('dashboard.tabHelp.clans'),
      className: "data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
    },
  ];

  return (
    <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 gap-2 h-auto p-2 bg-card/80 border border-gold/20 rounded-xl backdrop-blur-sm">
      {tabs.map((tab) => (
        <TabWithHelp key={tab.value} {...tab} />
      ))}
    </TabsList>
  );
}
