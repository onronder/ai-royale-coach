import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { 
  Search, Swords, BarChart3, Bot, 
  ChevronDown, Zap, Target, TrendingUp, 
  MessageSquare, Shield, Users, Trophy,
  Sparkles, Crown, Star, Layers,
  Activity, GitCompare, Network, GraduationCap,
  Medal, Clock, Crosshair, Brain
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}

interface FeatureCategory {
  id: string;
  titleKey: string;
  subtitleKey: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  glowColor: string;
  particleColor: string;
  features: Feature[];
}

const featureCategories: FeatureCategory[] = [
  {
    id: "analysis",
    titleKey: "landing.features.smartAnalysis",
    subtitleKey: "landing.features.smartAnalysisDesc",
    icon: <Search className="h-7 w-7" />,
    gradient: "from-primary via-primary-glow to-primary",
    borderColor: "border-primary/30",
    glowColor: "hsl(190 100% 50%)",
    particleColor: "hsl(190 100% 50% / 0.4)",
    features: [
      { icon: <Activity className="h-5 w-5" />, titleKey: "landing.features.analysis.battleHistory", descKey: "landing.features.analysis.battleHistoryDesc" },
      { icon: <Crosshair className="h-5 w-5" />, titleKey: "landing.features.analysis.matchReplay", descKey: "landing.features.analysis.matchReplayDesc" },
      { icon: <Shield className="h-5 w-5" />, titleKey: "landing.features.analysis.counterDeck", descKey: "landing.features.analysis.counterDeckDesc" },
      { icon: <Target className="h-5 w-5" />, titleKey: "landing.features.analysis.matchupPredictions", descKey: "landing.features.analysis.matchupPredictionsDesc" },
      { icon: <GitCompare className="h-5 w-5" />, titleKey: "landing.features.analysis.deckComparison", descKey: "landing.features.analysis.deckComparisonDesc" },
      { icon: <Users className="h-5 w-5" />, titleKey: "landing.features.analysis.clanStats", descKey: "landing.features.analysis.clanStatsDesc" },
    ]
  },
  {
    id: "deck",
    titleKey: "landing.features.deckOptimization",
    subtitleKey: "landing.features.deckOptimizationDesc",
    icon: <Swords className="h-7 w-7" />,
    gradient: "from-gold via-warning to-gold",
    borderColor: "border-gold/30",
    glowColor: "hsl(45 100% 55%)",
    particleColor: "hsl(45 100% 55% / 0.4)",
    features: [
      { icon: <Layers className="h-5 w-5" />, titleKey: "landing.features.deck.visualBuilder", descKey: "landing.features.deck.visualBuilderDesc" },
      { icon: <Zap className="h-5 w-5" />, titleKey: "landing.features.deck.cardReplacement", descKey: "landing.features.deck.cardReplacementDesc" },
      { icon: <Crown className="h-5 w-5" />, titleKey: "landing.features.deck.metaTemplates", descKey: "landing.features.deck.metaTemplatesDesc" },
      { icon: <Network className="h-5 w-5" />, titleKey: "landing.features.deck.synergyMatrix", descKey: "landing.features.deck.synergyMatrixDesc" },
      { icon: <Star className="h-5 w-5" />, titleKey: "landing.features.deck.elixirTrade", descKey: "landing.features.deck.elixirTradeDesc" },
      { icon: <TrendingUp className="h-5 w-5" />, titleKey: "landing.features.deck.metaTrend", descKey: "landing.features.deck.metaTrendDesc" },
    ]
  },
  {
    id: "tracking",
    titleKey: "landing.features.performanceTracking",
    subtitleKey: "landing.features.performanceTrackingDesc",
    icon: <BarChart3 className="h-7 w-7" />,
    gradient: "from-emerald via-success to-emerald",
    borderColor: "border-emerald/30",
    glowColor: "hsl(155 100% 40%)",
    particleColor: "hsl(155 100% 40% / 0.4)",
    features: [
      { icon: <Trophy className="h-5 w-5" />, titleKey: "landing.features.tracking.trophyProgress", descKey: "landing.features.tracking.trophyProgressDesc" },
      { icon: <BarChart3 className="h-5 w-5" />, titleKey: "landing.features.tracking.winRateAnalytics", descKey: "landing.features.tracking.winRateAnalyticsDesc" },
      { icon: <Activity className="h-5 w-5" />, titleKey: "landing.features.tracking.deckUsage", descKey: "landing.features.tracking.deckUsageDesc" },
      { icon: <Layers className="h-5 w-5" />, titleKey: "landing.features.tracking.cardCollection", descKey: "landing.features.tracking.cardCollectionDesc" },
      { icon: <Star className="h-5 w-5" />, titleKey: "landing.features.tracking.cardMastery", descKey: "landing.features.tracking.cardMasteryDesc" },
      { icon: <Medal className="h-5 w-5" />, titleKey: "landing.features.tracking.achievementBadges", descKey: "landing.features.tracking.achievementBadgesDesc" },
    ]
  },
  {
    id: "ai",
    titleKey: "landing.features.aiPowered",
    subtitleKey: "landing.features.aiPoweredDesc",
    icon: <Bot className="h-7 w-7" />,
    gradient: "from-royal via-legendary to-royal",
    borderColor: "border-royal/30",
    glowColor: "hsl(270 100% 60%)",
    particleColor: "hsl(270 100% 60% / 0.4)",
    features: [
      { icon: <MessageSquare className="h-5 w-5" />, titleKey: "landing.features.ai.coachChat", descKey: "landing.features.ai.coachChatDesc" },
      { icon: <Brain className="h-5 w-5" />, titleKey: "landing.features.ai.personalizedAnalysis", descKey: "landing.features.ai.personalizedAnalysisDesc" },
      { icon: <GraduationCap className="h-5 w-5" />, titleKey: "landing.features.ai.matchCoaching", descKey: "landing.features.ai.matchCoachingDesc" },
      { icon: <Target className="h-5 w-5" />, titleKey: "landing.features.ai.strategicRecommendations", descKey: "landing.features.ai.strategicRecommendationsDesc" },
      { icon: <Shield className="h-5 w-5" />, titleKey: "landing.features.ai.counterStrategy", descKey: "landing.features.ai.counterStrategyDesc" },
      { icon: <Clock className="h-5 w-5" />, titleKey: "landing.features.ai.realtimeTips", descKey: "landing.features.ai.realtimeTipsDesc" },
    ]
  }
];

export function FeatureShowcase() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-category-id');
            if (id) {
              setVisibleCards(prev => new Set([...prev, id]));
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: '50px' }
    );

    const cards = sectionRef.current?.querySelectorAll('[data-category-id]');
    cards?.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-background via-card/20 to-background border-t border-border/50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-royal/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/3 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/20 border border-gold/30 mb-6">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-sm font-rajdhani font-semibold text-gold uppercase tracking-wider">{t("landing.features.badge")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-rajdhani mb-4 text-embossed">
            {t("landing.features.title").toUpperCase()}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landing.features.subtitle")}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {featureCategories.map((category, categoryIndex) => {
            const isVisible = visibleCards.has(category.id);
            const isExpanded = expandedId === category.id;
            
            return (
              <div
                key={category.id}
                data-category-id={category.id}
                className={cn(
                  "group relative rounded-2xl border-2 bg-card/50 backdrop-blur-sm cursor-pointer overflow-hidden",
                  "transition-all duration-500 ease-out",
                  category.borderColor,
                  isExpanded ? "md:col-span-2" : "",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
                onClick={() => toggleExpand(category.id)}
                style={{ 
                  transitionDelay: isVisible ? `${categoryIndex * 100}ms` : '0ms',
                  boxShadow: isExpanded ? `0 0 60px ${category.glowColor.replace(')', ' / 0.3)')}` : undefined,
                  borderColor: isExpanded ? category.glowColor.replace(')', ' / 0.6)') : undefined,
                }}
              >
                {/* Animated border glow when expanded */}
                {isExpanded && (
                  <div 
                    className="absolute inset-0 rounded-2xl animate-border-pulse pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${category.glowColor.replace(')', ' / 0.2)')}, transparent)`,
                      backgroundSize: '200% 100%',
                    }}
                  />
                )}

                {/* Category-colored floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="absolute w-2 h-2 rounded-full animate-float-particle"
                      style={{
                        background: category.particleColor,
                        left: `${15 + i * 20}%`,
                        top: `${20 + (i % 3) * 30}%`,
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: `${4 + i}s`,
                        opacity: isExpanded ? 0.8 : 0.3,
                      }}
                    />
                  ))}
                </div>

                {/* Gradient overlay on hover */}
                <div className={cn(
                  "absolute inset-0 transition-opacity duration-500 pointer-events-none",
                  `bg-gradient-to-br ${category.gradient}`,
                  isExpanded ? "opacity-[0.08]" : "opacity-0 group-hover:opacity-[0.05]"
                )} />
                
                {/* Card Header */}
                <div className="p-6 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500",
                      `bg-gradient-to-br ${category.gradient}`,
                      isExpanded && "scale-110 animate-icon-pulse"
                    )}
                    style={{
                      boxShadow: isExpanded ? `0 0 30px ${category.glowColor.replace(')', ' / 0.5)')}` : undefined
                    }}>
                      <div className="text-background">
                        {category.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-rajdhani font-bold text-foreground group-hover:text-foreground/90 transition-colors">
                        {t(category.titleKey)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(category.subtitleKey)}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={cn(
                    "h-6 w-6 text-muted-foreground transition-all duration-500",
                    isExpanded && "rotate-180 text-foreground"
                  )} />
                </div>

                {/* Expanded Content */}
                <div className={cn(
                  "grid transition-all duration-500 ease-out",
                  isExpanded 
                    ? "grid-rows-[1fr] opacity-100" 
                    : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6">
                      <div 
                        className="h-px mb-6"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${category.glowColor.replace(')', ' / 0.5)')}, transparent)`
                        }}
                      />
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.features.map((feature, featureIndex) => (
                          <div
                            key={feature.titleKey}
                            className={cn(
                              "p-4 rounded-xl bg-background/50 border border-border/50 transition-all duration-300",
                              "hover:border-border hover:-translate-y-1 hover:shadow-lg",
                              isExpanded && "animate-feature-cascade"
                            )}
                            style={{ 
                              animationDelay: `${featureIndex * 80}ms`,
                              animationFillMode: 'backwards'
                            }}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105",
                              `bg-gradient-to-br ${category.gradient}`
                            )}>
                              <div className="text-background">
                                {feature.icon}
                              </div>
                            </div>
                            <h4 className="font-rajdhani font-bold text-foreground mb-1">
                              {t(feature.titleKey)}
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {t(feature.descKey)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
