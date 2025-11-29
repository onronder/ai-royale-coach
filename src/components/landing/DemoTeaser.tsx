import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Zap, TrendingUp, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { sampleDecks } from "@/data/sampleDecks";
import { AnimatedCounter } from "./AnimatedCounter";

export function DemoTeaser() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDeckIndex, setSelectedDeckIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  const selectedDeck = sampleDecks[selectedDeckIndex];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-rotate decks
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setSelectedDeckIndex((prev) => (prev + 1) % sampleDecks.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const getTranslatedArchetype = (archetype: string) => {
    return t(`landing.demo.cards.archetypes.${archetype}`, archetype);
  };

  return (
    <section 
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-background via-card/20 to-background relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-royal/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className={cn(
          "max-w-6xl mx-auto transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        )}>
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6">
              <Play className="h-4 w-4 text-primary" />
              <span className="text-sm font-rajdhani font-semibold text-primary uppercase tracking-wider">
                {t("landing.demoTeaser.badge")}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-rajdhani mb-4 text-embossed">
              {t("landing.demoTeaser.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.demoTeaser.subtitle")}
            </p>
          </div>

          {/* Preview Grid */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Deck Preview */}
            <Card className={cn(
              "p-6 bg-card/50 backdrop-blur border-primary/20 transition-all duration-500",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )} style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-rajdhani font-bold text-foreground">
                  {selectedDeck.name}
                </h3>
                <span className={cn(
                  "text-sm px-3 py-1 rounded-full font-rajdhani font-semibold border",
                  `bg-${selectedDeck.color}/10 text-${selectedDeck.color} border-${selectedDeck.color}/30`
                )}>
                  {getTranslatedArchetype(selectedDeck.stats.archetype)}
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {selectedDeck.cards.map((card, idx) => (
                  <div 
                    key={card.name}
                    className={cn(
                      "aspect-square rounded-lg bg-gradient-to-br from-card to-card-elevated border border-border/50",
                      "flex items-center justify-center text-3xl",
                      "transition-all duration-300 hover:scale-110 hover:shadow-glow",
                      isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
                    )}
                    style={{ 
                      transitionDelay: isVisible ? `${300 + idx * 50}ms` : '0ms'
                    }}
                  >
                    {card.emoji}
                  </div>
                ))}
              </div>

              {/* Deck selector dots */}
              <div className="flex justify-center gap-2">
                {sampleDecks.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDeckIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      index === selectedDeckIndex 
                        ? "w-6 bg-primary" 
                        : "bg-border hover:bg-muted-foreground"
                    )}
                  />
                ))}
              </div>
            </Card>

            {/* Stats & AI Insight Preview */}
            <div className="space-y-4">
              <Card className={cn(
                "p-6 bg-card/50 backdrop-blur border-gold/20 transition-all duration-500",
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              )} style={{ transitionDelay: '400ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-gold" />
                  <h4 className="font-rajdhani font-bold text-lg text-foreground">
                    {t("landing.demoTeaser.statsTitle")}
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-success">
                      {isVisible && (
                        <AnimatedCounter end={selectedDeck.stats.winRate} decimals={1} suffix="%" delay={500} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("landing.demo.winRate")}</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">
                      {isVisible && (
                        <AnimatedCounter end={selectedDeck.stats.avgElixir} decimals={1} delay={600} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("landing.demo.avgElixir")}</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {isVisible && (
                        <AnimatedCounter end={selectedDeck.stats.synergyScore} decimals={1} suffix="/10" delay={700} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("landing.demo.deckComplexity")}</p>
                  </div>
                </div>
              </Card>

              <Card className={cn(
                "p-6 bg-gradient-to-br from-royal/10 to-primary/10 border-royal/30 transition-all duration-500",
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              )} style={{ transitionDelay: '600ms' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-royal animate-pulse-glow" />
                  <h4 className="font-rajdhani font-bold text-foreground">
                    {t("landing.demoTeaser.aiInsightTitle")}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {t("landing.demoTeaser.aiInsightPreview")}
                </p>
              </Card>

              <Button
                onClick={() => navigate("/demo")}
                className="w-full"
                variant="golden"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5" />
                {t("landing.demoTeaser.exploreButton")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
