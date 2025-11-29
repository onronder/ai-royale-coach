import { useTranslation } from "react-i18next";
import { CheckCircle, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const explainerItems = [
  { key: "deckAnalysis", icon: "🎴" },
  { key: "winRates", icon: "📈" },
  { key: "coachTips", icon: "💬" },
];

export const DemoExplainer = () => {
  const { t } = useTranslation();
  const { ref, hasAnimated } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-12 bg-gradient-to-b from-card/30 to-background relative">
      <div className="container mx-auto px-4">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
          hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald/20 border border-emerald/30 mb-6">
            <Sparkles className="h-4 w-4 text-emerald" />
            <span className="text-sm font-rajdhani font-semibold text-emerald uppercase tracking-wider">
              {t("landing.demoPage.explainer.badge")}
            </span>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-8 text-foreground">
            {t("landing.demoPage.explainer.title")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {explainerItems.map((item, index) => (
              <div
                key={item.key}
                className={`p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm transition-all duration-500 ${
                  hasAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 150 + 200}ms` }}
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="flex items-start gap-2 text-left">
                  <CheckCircle className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-rajdhani font-bold text-foreground mb-1">
                      {t(`landing.demoPage.explainer.items.${item.key}.title`)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t(`landing.demoPage.explainer.items.${item.key}.description`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
