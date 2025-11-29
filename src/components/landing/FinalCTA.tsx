import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Play, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinalCTA() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Dramatic background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-royal/5 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Floating particles */}
        <div className="floating-particles">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Border accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className={cn(
          "max-w-4xl mx-auto text-center space-y-8 transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        )}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border border-gold/40 shadow-gold/30 shadow-lg">
            <Crown className="h-5 w-5 text-gold animate-trophy-shine" />
            <span className="text-sm font-rajdhani font-bold text-gold uppercase tracking-wider">
              {t("landing.finalCTA.badge")}
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-rajdhani">
            <span className="text-foreground">{t("landing.finalCTA.title")}</span>
          </h2>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("landing.finalCTA.subtitle")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              onClick={() => navigate("/auth")}
              variant="golden"
              size="lg"
              className="min-w-[200px] group"
            >
              <Zap className="mr-2 h-5 w-5" />
              {t("landing.finalCTA.primaryButton")}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              onClick={() => navigate("/demo")}
              variant="outline"
              size="lg"
              className="min-w-[200px] border-primary/50 hover:bg-primary/10"
            >
              <Play className="mr-2 h-5 w-5" />
              {t("landing.finalCTA.secondaryButton")}
            </Button>
          </div>

          {/* Trust text */}
          <p className="text-sm text-muted-foreground">
            {t("landing.finalCTA.trustText")}
          </p>
        </div>
      </div>
    </section>
  );
}
