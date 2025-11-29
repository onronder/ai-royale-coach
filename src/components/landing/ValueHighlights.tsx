import { useTranslation } from "react-i18next";
import { Bot, BarChart3, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaggeredAnimation } from "@/hooks/useScrollAnimation";

interface ValueCard {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  gradient: string;
  glowColor: string;
}

const valueCards: ValueCard[] = [
  {
    icon: <Bot className="h-8 w-8" />,
    titleKey: "landing.valueHighlights.aiCoach.title",
    descKey: "landing.valueHighlights.aiCoach.desc",
    gradient: "from-royal to-royal/60",
    glowColor: "hsl(270 100% 60% / 0.4)",
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    titleKey: "landing.valueHighlights.analytics.title",
    descKey: "landing.valueHighlights.analytics.desc",
    gradient: "from-primary to-primary-glow",
    glowColor: "hsl(190 100% 50% / 0.4)",
  },
  {
    icon: <Zap className="h-8 w-8" />,
    titleKey: "landing.valueHighlights.deckOptimization.title",
    descKey: "landing.valueHighlights.deckOptimization.desc",
    gradient: "from-gold to-warning",
    glowColor: "hsl(45 100% 55% / 0.4)",
  },
  {
    icon: <Trophy className="h-8 w-8" />,
    titleKey: "landing.valueHighlights.winRate.title",
    descKey: "landing.valueHighlights.winRate.desc",
    gradient: "from-emerald to-success",
    glowColor: "hsl(155 100% 40% / 0.4)",
  },
];

export function ValueHighlights() {
  const { t } = useTranslation();
  const { containerRef, isItemVisible, getItemDelay } = useStaggeredAnimation(
    valueCards.length,
    { threshold: 0.15, staggerDelay: 150, rootMargin: '50px' }
  );

  return (
    <section 
      id="value-highlights" 
      ref={containerRef} 
      className="py-16 bg-gradient-to-b from-background via-card/30 to-background border-y border-border/30 overflow-hidden"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
          {valueCards.map((card, index) => {
            const isVisible = isItemVisible(index);
            
            return (
              <div
                key={card.titleKey}
                data-stagger-index={index}
                className={cn(
                  "group relative p-4 md:p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50",
                  "transition-all duration-700 ease-out transform-gpu",
                  "hover:border-border hover:-translate-y-2 hover:shadow-lg",
                  isVisible 
                    ? "opacity-100 translate-y-0 scale-100" 
                    : "opacity-0 translate-y-12 scale-95"
                )}
                style={{
                  transitionDelay: `${getItemDelay(index)}ms`,
                }}
              >
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at center, ${card.glowColor.replace(' / 0.4)', ' / 0.15)')}, transparent 70%)`,
                  }}
                />

                {/* Icon */}
                <div className={cn(
                  "w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-4",
                  "transition-all duration-300 group-hover:scale-110",
                  `bg-gradient-to-br ${card.gradient}`
                )}
                style={{
                  boxShadow: `0 0 20px ${card.glowColor}`,
                }}>
                  <div className="text-background">
                    {card.icon}
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-rajdhani font-bold text-base md:text-lg text-foreground mb-2 group-hover:text-foreground/90 transition-colors">
                  {t(card.titleKey)}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {t(card.descKey)}
                </p>

                {/* Animated particles on hover */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full animate-float-particle"
                      style={{
                        background: card.glowColor,
                        left: `${20 + i * 30}%`,
                        top: `${30 + (i % 2) * 40}%`,
                        animationDelay: `${i * 0.3}s`,
                        animationDuration: `${3 + i * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
