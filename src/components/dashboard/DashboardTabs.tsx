import { useTranslation } from "react-i18next";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Swords, Target, Wrench, TrendingUp, Sparkles, Award, UserPlus } from "lucide-react";

export function DashboardTabs() {
  const { t } = useTranslation();

  return (
    <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 gap-2 h-auto p-2 bg-card/80 border border-gold/20 rounded-xl backdrop-blur-sm">
      <TabsTrigger 
        value="overview" 
        className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
      >
        <Trophy className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.stats')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="matches"
        className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
      >
        <Swords className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.matches')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="deck"
        className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
      >
        <Target className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.deck')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="builder"
        className="data-[state=active]:bg-gradient-accent data-[state=active]:text-accent-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
      >
        <Wrench className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.builder')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="analytics"
        className="data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
      >
        <TrendingUp className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.analytics')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="collection"
        className="data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
      >
        <Sparkles className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.cards')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="leaderboard"
        className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
      >
        <TrendingUp className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.ranks')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="tournaments"
        className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
      >
        <Award className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.tourneys')}</span>
      </TabsTrigger>
      <TabsTrigger 
        value="clans"
        className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
      >
        <UserPlus className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.tabs.clans')}</span>
      </TabsTrigger>
    </TabsList>
  );
}
