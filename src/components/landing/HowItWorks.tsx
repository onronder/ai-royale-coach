import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Hash, Brain, Trophy, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  color: string;
  glowColor: string;
}

const steps: Step[] = [
  {
    id: 1,
    icon: <UserPlus className="h-8 w-8" />,
    titleKey: "landing.howItWorks.step1Title",
    descKey: "landing.howItWorks.step1Desc",
    color: "from-primary to-primary-glow",
    glowColor: "hsl(190 100% 50% / 0.4)",
  },
  {
    id: 2,
    icon: <Hash className="h-8 w-8" />,
    titleKey: "landing.howItWorks.step2Title",
    descKey: "landing.howItWorks.step2Desc",
    color: "from-gold to-warning",
    glowColor: "hsl(45 100% 55% / 0.4)",
  },
  {
    id: 3,
    icon: <Brain className="h-8 w-8" />,
    titleKey: "landing.howItWorks.step3Title",
    descKey: "landing.howItWorks.step3Desc",
    color: "from-royal to-legendary",
    glowColor: "hsl(270 100% 60% / 0.4)",
  },
  {
    id: 4,
    icon: <Trophy className="h-8 w-8" />,
    titleKey: "landing.howItWorks.step4Title",
    descKey: "landing.howItWorks.step4Desc",
    color: "from-emerald to-success",
    glowColor: "hsl(155 100% 40% / 0.4)",
  },
];

export function HowItWorks() {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepId = parseInt(entry.target.getAttribute('data-step-id') || '0');
            if (stepId) {
              setTimeout(() => {
                setVisibleSteps(prev => new Set([...prev, stepId]));
              }, (stepId - 1) * 200);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    const stepElements = sectionRef.current?.querySelectorAll('[data-step-id]');
    stepElements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-card/20 via-background to-card/30 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-royal/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-rajdhani font-semibold text-primary uppercase tracking-wider">{t("landing.howItWorks.badge")}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-rajdhani mb-4 text-embossed">
            {t("landing.howItWorks.title").toUpperCase()}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landing.howItWorks.subtitle")}
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="max-w-5xl mx-auto relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2">
            <div className="h-full bg-border/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-gold via-royal to-emerald transition-all duration-1000 ease-out"
                style={{ 
                  width: `${(visibleSteps.size / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const isVisible = visibleSteps.has(step.id);
              const isActive = activeStep === step.id;
              
              return (
                <div
                  key={step.id}
                  data-step-id={step.id}
                  className={cn(
                    "relative group cursor-pointer",
                    "transition-all duration-700 ease-out",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                  )}
                  onMouseEnter={() => setActiveStep(step.id)}
                  onMouseLeave={() => setActiveStep(null)}
                >
                  {/* Step Card */}
                  <div className={cn(
                    "relative p-6 rounded-2xl border-2 border-border/50 bg-card/50 backdrop-blur-sm",
                    "transition-all duration-500",
                    "hover:border-border hover:-translate-y-2",
                    isActive && "border-opacity-100"
                  )}
                  style={{
                    boxShadow: isActive ? `0 20px 60px -15px ${step.glowColor}` : undefined,
                    borderColor: isActive ? step.glowColor.replace(' / 0.4)', ' / 0.6)') : undefined,
                  }}>
                    {/* Glow effect when active */}
                    {isActive && (
                      <div 
                        className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at center, ${step.glowColor.replace(' / 0.4)', ' / 0.15)')}, transparent 70%)`,
                        }}
                      />
                    )}

                    {/* Step Number Badge */}
                    <div className={cn(
                      "absolute -top-4 left-6 w-8 h-8 rounded-full flex items-center justify-center",
                      "font-rajdhani font-bold text-sm border-2 border-background",
                      `bg-gradient-to-br ${step.color}`,
                      "transition-transform duration-300",
                      isActive && "scale-125"
                    )}
                    style={{
                      boxShadow: isVisible ? `0 0 20px ${step.glowColor}` : undefined
                    }}>
                      <span className="text-background">{step.id}</span>
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center mb-4 mt-2",
                      "transition-all duration-500",
                      `bg-gradient-to-br ${step.color}`,
                      isActive && "scale-110 animate-icon-pulse"
                    )}
                    style={{
                      boxShadow: isActive ? `0 0 40px ${step.glowColor}` : undefined
                    }}>
                      <div className="text-background">
                        {step.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-rajdhani font-bold text-foreground mb-2">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(step.descKey)}
                    </p>

                    {/* Animated particles when active */}
                    {isActive && (
                      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        {[...Array(6)].map((_, i) => (
                          <span
                            key={i}
                            className="absolute w-1.5 h-1.5 rounded-full animate-float-particle"
                            style={{
                              background: step.glowColor,
                              left: `${10 + i * 15}%`,
                              top: `${20 + (i % 3) * 25}%`,
                              animationDelay: `${i * 0.3}s`,
                              animationDuration: `${3 + i * 0.5}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Arrow connector - Mobile/Tablet */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center my-4 lg:hidden">
                      <ArrowRight className={cn(
                        "w-6 h-6 text-muted-foreground rotate-90 transition-all duration-500",
                        isVisible && "text-primary"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
