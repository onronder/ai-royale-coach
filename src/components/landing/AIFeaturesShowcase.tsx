import { useTranslation } from "react-i18next";
import { Brain, Target, MessageSquare, Zap, ArrowRight, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const aiFeatures = [
  {
    icon: Brain,
    key: "battleAnalysis",
    gradient: "from-primary to-royal",
  },
  {
    icon: Target,
    key: "matchupPredictions",
    gradient: "from-crimson to-primary",
  },
  {
    icon: MessageSquare,
    key: "coachChat",
    gradient: "from-gold to-legendary",
  },
  {
    icon: Zap,
    key: "deckOptimization",
    gradient: "from-emerald to-primary",
  },
];

const flowSteps = [
  { key: "yourData", icon: "📊" },
  { key: "aiAnalysis", icon: "🧠" },
  { key: "insights", icon: "💡" },
  { key: "betterWins", icon: "🏆" },
];

export const AIFeaturesShowcase = () => {
  const { t } = useTranslation();
  const { ref, hasAnimated } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section ref={ref} className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-royal/5 rounded-full blur-3xl" />
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landing.demoPage.aiFeatures.subtitle")}
          </p>
        </div>

        {/* AI Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {aiFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className={`group relative p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-500 hover:shadow-lg hover:shadow-primary/10 ${
                  hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100 + 200}ms` }}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.gradient} mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-lg font-rajdhani font-bold text-foreground mb-2">
                  {t(`landing.demoPage.aiFeatures.features.${feature.key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`landing.demoPage.aiFeatures.features.${feature.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>

        {/* AI Flow Diagram */}
        <div className={`bg-card/30 border border-border/50 rounded-2xl p-8 backdrop-blur-sm transition-all duration-700 ${
          hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`} style={{ transitionDelay: '600ms' }}>
          <h3 className="text-xl font-rajdhani font-bold text-center mb-8 text-foreground">
            {t("landing.demoPage.aiFeatures.flowTitle")}
          </h3>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
            {flowSteps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-royal/20 border border-primary/30 flex items-center justify-center text-2xl mb-2 hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground text-center">
                    {t(`landing.demoPage.aiFeatures.flow.${step.key}`)}
                  </span>
                </div>
                {index < flowSteps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-primary mx-4 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className={`flex flex-wrap justify-center gap-8 mt-12 transition-all duration-700 ${
          hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`} style={{ transitionDelay: '800ms' }}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-2xl font-bold text-primary">50K+</span>
            <span className="text-sm">{t("landing.demoPage.aiFeatures.stats.battlesAnalyzed")}</span>
          </div>
          <div className="w-px h-8 bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-2xl font-bold text-gold">10K+</span>
            <span className="text-sm">{t("landing.demoPage.aiFeatures.stats.playersCoached")}</span>
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
