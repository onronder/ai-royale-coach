import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Lock, Globe, Star, Users, Swords, BarChart3, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./AnimatedCounter";

interface Stat {
  icon: React.ReactNode;
  valueKey: string;
  labelKey: string;
  value: number;
  suffix: string;
  color: string;
}

interface Testimonial {
  quoteKey: string;
  authorKey: string;
  roleKey: string;
}

const stats: Stat[] = [
  {
    icon: <Swords className="h-6 w-6" />,
    valueKey: "landing.trust.stats.battles",
    labelKey: "landing.trust.stats.battlesLabel",
    value: 50000,
    suffix: "+",
    color: "text-primary",
  },
  {
    icon: <Users className="h-6 w-6" />,
    valueKey: "landing.trust.stats.players",
    labelKey: "landing.trust.stats.playersLabel",
    value: 10000,
    suffix: "+",
    color: "text-gold",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    valueKey: "landing.trust.stats.countries",
    labelKey: "landing.trust.stats.countriesLabel",
    value: 20,
    suffix: "+",
    color: "text-emerald",
  },
  {
    icon: <Star className="h-6 w-6" />,
    valueKey: "landing.trust.stats.rating",
    labelKey: "landing.trust.stats.ratingLabel",
    value: 4.8,
    suffix: "★",
    color: "text-warning",
  },
];

const testimonials: Testimonial[] = [
  {
    quoteKey: "landing.trust.testimonials.1.quote",
    authorKey: "landing.trust.testimonials.1.author",
    roleKey: "landing.trust.testimonials.1.role",
  },
  {
    quoteKey: "landing.trust.testimonials.2.quote",
    authorKey: "landing.trust.testimonials.2.author",
    roleKey: "landing.trust.testimonials.2.role",
  },
  {
    quoteKey: "landing.trust.testimonials.3.quote",
    authorKey: "landing.trust.testimonials.3.author",
    roleKey: "landing.trust.testimonials.3.role",
  },
];

interface TrustBadge {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}

const trustBadges: TrustBadge[] = [
  {
    icon: <Shield className="h-5 w-5" />,
    titleKey: "landing.trust.badges.secure.title",
    descKey: "landing.trust.badges.secure.desc",
  },
  {
    icon: <Lock className="h-5 w-5" />,
    titleKey: "landing.trust.badges.noPassword.title",
    descKey: "landing.trust.badges.noPassword.desc",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    titleKey: "landing.trust.badges.privacy.title",
    descKey: "landing.trust.badges.privacy.desc",
  },
];

export function TrustSection() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

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

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-card/30 via-background to-card/20 relative overflow-hidden"
    >
      {/* Background texture */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={stat.labelKey}
              className={cn(
                "text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50",
                "transition-all duration-500",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className={cn("mx-auto mb-3", stat.color)}>
                {stat.icon}
              </div>
              <div className={cn("text-3xl md:text-4xl font-bold font-rajdhani mb-1", stat.color)}>
                {isVisible && (
                  <AnimatedCounter 
                    end={stat.value} 
                    decimals={stat.value < 10 ? 1 : 0}
                    suffix={stat.suffix}
                    delay={index * 150}
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t(stat.labelKey)}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className={cn(
          "max-w-3xl mx-auto mb-16 transition-all duration-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )} style={{ transitionDelay: '400ms' }}>
          <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-gold/20 p-8 md:p-12">
            {/* Quote icon */}
            <Quote className="absolute top-6 left-6 h-8 w-8 text-gold/30" />
            
            {/* Testimonial content */}
            <div className="text-center space-y-6">
              <p className="text-lg md:text-xl text-foreground leading-relaxed italic">
                "{t(testimonials[activeTestimonial].quoteKey)}"
              </p>
              <div>
                <p className="font-rajdhani font-bold text-gold">
                  {t(testimonials[activeTestimonial].authorKey)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(testimonials[activeTestimonial].roleKey)}
                </p>
              </div>
            </div>

            {/* Testimonial indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    index === activeTestimonial 
                      ? "w-8 bg-gold" 
                      : "bg-border hover:bg-muted-foreground"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className={cn(
          "flex flex-wrap justify-center gap-4 md:gap-8 transition-all duration-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )} style={{ transitionDelay: '600ms' }}>
          {trustBadges.map((badge, index) => (
            <div
              key={badge.titleKey}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/30 border border-border/50"
            >
              <div className="text-emerald">
                {badge.icon}
              </div>
              <div>
                <p className="font-rajdhani font-semibold text-sm text-foreground">
                  {t(badge.titleKey)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(badge.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
