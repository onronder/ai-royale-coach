import { useTranslation } from "react-i18next";
import { 
  Brain, Target, MessageSquare, Zap, ArrowRight, Sparkles, 
  Swords, User, TrendingUp, Shield, RefreshCw, BarChart3,
  Trophy, Lightbulb, ChevronDown
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AnimatePresence, motion } from "framer-motion";

const aiCategories = [
  {
    key: "smartAnalysis",
    icon: Brain,
    gradient: "from-primary to-royal",
    features: [
      { key: "battleAnalysis", icon: Swords },
      { key: "playerProfile", icon: User },
      { key: "pivotalMoments", icon: Lightbulb },
      { key: "advancedStats", icon: BarChart3 },
    ],
  },
  {
    key: "predictions",
    icon: Target,
    gradient: "from-crimson to-primary",
    features: [
      { key: "matchupPredictions", icon: Target },
      { key: "trophyPerformance", icon: Trophy },
      { key: "counterDeck", icon: Shield },
    ],
  },
  {
    key: "deckIntelligence",
    icon: Zap,
    gradient: "from-gold to-legendary",
    features: [
      { key: "personalizedRecs", icon: Sparkles },
      { key: "cardReplacements", icon: RefreshCw },
      { key: "compositionAnalysis", icon: BarChart3 },
    ],
  },
  {
    key: "personalCoaching",
    icon: MessageSquare,
    gradient: "from-emerald to-primary",
    features: [
      { key: "coachChat", icon: MessageSquare },
    ],
    coachContext: ["savedDecks", "cardMastery", "achievements", "matchHistory", "cardCollection"],
  },
];

const pipelineSteps = [
  { key: "yourBattles", icon: "⚔️", color: "from-crimson to-crimson/70" },
  { key: "apiSync", icon: "🔄", color: "from-royal to-royal/70" },
  { key: "aiAnalysis", icon: "🧠", color: "from-primary to-primary/70" },
  { key: "playerProfile", icon: "👤", color: "from-emerald to-emerald/70" },
  { key: "insights", icon: "💡", color: "from-gold to-gold/70" },
];

export const AIFeaturesShowcase = () => {
  const { t } = useTranslation();
  const { ref, hasAnimated } = useScrollAnimation({ threshold: 0.1 });
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedPipelineStep, setSelectedPipelineStep] = useState<string | null>(null);

  return (
    <section ref={ref} className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-royal/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-gold/5 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-rajdhani font-semibold text-primary uppercase tracking-wider">
              {t("landing.demoPage.aiFeatures.badge")}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-rajdhani mb-4">
            <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t("landing.demoPage.aiFeatures.title")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            {t("landing.demoPage.aiFeatures.subtitle")}
          </p>
          <p className="text-2xl font-rajdhani font-bold text-gold">
            {t("landing.demoPage.aiFeatures.featureCount")}
          </p>
        </div>

        {/* AI Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {aiCategories.map((category, index) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategory === category.key;
            
            return (
              <Collapsible
                key={category.key}
                open={isExpanded}
                onOpenChange={(open) => setExpandedCategory(open ? category.key : null)}
                className={`group relative rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:shadow-lg hover:shadow-primary/10 ${
                  hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100 + 200}ms` }}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
                
                {/* Category Header */}
                <CollapsibleTrigger asChild>
                  <button className="w-full p-6 text-left relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${category.gradient}`}>
                          <CategoryIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-rajdhani font-bold text-foreground">
                            {t(`landing.demoPage.aiFeatures.categories.${category.key}.title`)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t(`landing.demoPage.aiFeatures.categories.${category.key}.count`, { count: category.features.length })}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-300",
                        isExpanded && "rotate-180"
                      )} />
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {t(`landing.demoPage.aiFeatures.categories.${category.key}.description`)}
                    </p>
                  </button>
                </CollapsibleTrigger>

                {/* Expandable Features List */}
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="px-6 pb-6 space-y-3">
                    {category.features.map((feature) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <div
                          key={feature.key}
                          className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                        >
                          <FeatureIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">
                              {t(`landing.demoPage.aiFeatures.features.${feature.key}.title`)}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {t(`landing.demoPage.aiFeatures.features.${feature.key}.description`)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Coach Context for Personal Coaching category */}
                    {category.coachContext && (
                      <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-xs font-semibold text-primary mb-2">
                          {t("landing.demoPage.aiFeatures.coachContext.title")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {category.coachContext.map((ctx) => (
                            <span
                              key={ctx}
                              className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary"
                            >
                              {t(`landing.demoPage.aiFeatures.coachContext.${ctx}`)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* AI Pipeline Flow - Interactive */}
        <div className={`bg-card/30 border border-border/50 rounded-2xl p-8 backdrop-blur-sm transition-all duration-700 ${
          hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`} style={{ transitionDelay: '600ms' }}>
          <h3 className="text-xl font-rajdhani font-bold text-center mb-2 text-foreground">
            {t("landing.demoPage.aiFeatures.pipeline.title")}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-2">
            {t("landing.demoPage.aiFeatures.pipeline.subtitle")}
          </p>
          <p className="text-xs text-primary text-center mb-8">
            {t("landing.demoPage.aiFeatures.pipeline.clickHint")}
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
            {pipelineSteps.map((step, index) => {
              const isSelected = selectedPipelineStep === step.key;
              return (
                <div key={step.key} className="flex items-center">
                  <button
                    onClick={() => setSelectedPipelineStep(isSelected ? null : step.key)}
                    className="flex flex-col items-center group"
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl mb-2 transition-all duration-300 cursor-pointer",
                      isSelected 
                        ? `bg-gradient-to-br ${step.color} border-transparent scale-110 shadow-lg shadow-primary/30` 
                        : "bg-gradient-to-br from-primary/20 to-royal/20 border-primary/30 hover:scale-110 hover:border-primary/50"
                    )}>
                      {step.icon}
                    </div>
                    <span className={cn(
                      "text-sm font-medium text-center max-w-[100px] transition-colors",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {t(`landing.demoPage.aiFeatures.pipeline.steps.${step.key}.title`)}
                    </span>
                  </button>
                  {index < pipelineSteps.length - 1 && (
                    <ArrowRight className={cn(
                      "h-5 w-5 mx-4 hidden md:block transition-colors",
                      isSelected || selectedPipelineStep === pipelineSteps[index + 1]?.key 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Expanded Pipeline Step Details */}
          <AnimatePresence mode="wait">
            {selectedPipelineStep && (
              <motion.div
                key={selectedPipelineStep}
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-8 overflow-hidden"
              >
                <div className={cn(
                  "p-6 rounded-xl border bg-gradient-to-br",
                  pipelineSteps.find(s => s.key === selectedPipelineStep)?.color,
                  "bg-opacity-10 border-primary/30"
                )}>
                  <div className="bg-background/90 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">
                        {pipelineSteps.find(s => s.key === selectedPipelineStep)?.icon}
                      </span>
                      <h4 className="text-lg font-rajdhani font-bold text-foreground">
                        {t(`landing.demoPage.aiFeatures.pipeline.steps.${selectedPipelineStep}.title`)}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t(`landing.demoPage.aiFeatures.pipeline.steps.${selectedPipelineStep}.description`)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(t(`landing.demoPage.aiFeatures.pipeline.steps.${selectedPipelineStep}.details`, { returnObjects: true }) as string[]).map((detail, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-xs rounded-full bg-primary/20 text-primary border border-primary/30"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust Indicators */}
        <div className={`flex flex-wrap justify-center gap-8 mt-12 transition-all duration-700 ${
          hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`} style={{ transitionDelay: '800ms' }}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-2xl font-bold text-primary">11</span>
            <span className="text-sm">{t("landing.demoPage.aiFeatures.stats.aiFeatures")}</span>
          </div>
          <div className="w-px h-8 bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-2xl font-bold text-gold">50K+</span>
            <span className="text-sm">{t("landing.demoPage.aiFeatures.stats.battlesAnalyzed")}</span>
          </div>
          <div className="w-px h-8 bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-2xl font-bold text-emerald">95%</span>
            <span className="text-sm">{t("landing.demoPage.aiFeatures.stats.accuracy")}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
