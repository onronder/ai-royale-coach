import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, Zap, Users, Trophy, ChevronDown, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import type { User } from "@supabase/supabase-js";

interface HeroSectionProps {
  user: User | null;
}

// Generate random particles for visual effect
const generateParticles = (count: number, type: 'ember' | 'sparkle') => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: 20 + Math.random() * 60,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 3,
    size: type === 'ember' ? 2 + Math.random() * 4 : 4 + Math.random() * 4,
  }));
};

export function HeroSection({ user }: HeroSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [playerTag, setPlayerTag] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  // Memoize particles to prevent regeneration on every render
  const embers = useMemo(() => generateParticles(12, 'ember'), []);
  const sparkles = useMemo(() => generateParticles(6, 'sparkle'), []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerTag.trim()) {
      toast.error(t("landing.hero.errors.enterTag"));
      return;
    }
    
    if (!user) {
      toast.error(t("landing.hero.errors.signIn"));
      navigate("/auth");
      return;
    }

    const cleanTag = playerTag.trim().replace("#", "");
    navigate(`/player/${cleanTag}`);
  };

  const scrollToFeatures = () => {
    document.getElementById('value-highlights')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden arena-bg parallax-container">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 hero-gradient-mesh" />
      
      {/* Noise texture overlay for depth */}
      <div className="noise-overlay" />

      {/* Animated particle layers */}
      <div className="hero-particles">
        {/* Large floating orbs - back layer with parallax */}
        <div className="parallax-layer parallax-layer--back">
          <div className="hero-particle hero-particle--orb absolute top-[10%] left-[15%]" />
          <div className="hero-particle hero-particle--orb-royal absolute top-[30%] right-[10%]" />
          <div className="hero-particle hero-particle--orb-gold absolute bottom-[20%] left-[60%]" />
        </div>

        {/* Mid layer orbs */}
        <div className="parallax-layer parallax-layer--mid">
          <div className="hero-particle hero-particle--orb absolute top-[50%] left-[5%]" style={{ width: 120, height: 120 }} />
          <div className="hero-particle hero-particle--orb-gold absolute top-[15%] right-[25%]" style={{ width: 100, height: 100 }} />
        </div>

        {/* Rising embers */}
        {embers.map((ember) => (
          <div
            key={`ember-${ember.id}`}
            className="hero-particle hero-particle--ember"
            style={{
              left: `${ember.left}%`,
              bottom: '-10px',
              width: ember.size,
              height: ember.size,
              animationDelay: `${ember.delay}s`,
              animationDuration: `${ember.duration}s`,
            }}
          />
        ))}

        {/* Sparkles */}
        {sparkles.map((sparkle) => (
          <div
            key={`sparkle-${sparkle.id}`}
            className="hero-particle hero-particle--sparkle"
            style={{
              left: `${sparkle.left}%`,
              top: `${sparkle.top}%`,
              width: sparkle.size,
              height: sparkle.size,
              animationDelay: `${sparkle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Floating card silhouettes with parallax */}
      <div className="parallax-layer parallax-layer--front pointer-events-none">
        <div className="floating-card absolute top-20 left-[8%] w-14 h-20" style={{ animationDelay: '0s' }} />
        <div className="floating-card absolute top-32 right-[12%] w-12 h-16" style={{ animationDelay: '1.5s' }} />
        <div className="floating-card absolute bottom-32 left-[18%] w-16 h-22" style={{ animationDelay: '3s' }} />
        <div className="floating-card absolute bottom-24 right-[8%] w-10 h-14" style={{ animationDelay: '0.5s' }} />
        <div className="floating-card absolute top-1/2 left-[3%] w-12 h-16" style={{ animationDelay: '2s' }} />
        <div className="floating-card absolute top-1/3 right-[5%] w-14 h-18" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* Vignette overlay for dramatic effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_100%)] opacity-60 pointer-events-none" />

      {/* Product Hunt Badge - Top Right */}
      <a 
        href="https://www.producthunt.com/products/ai-royale-the-live-e-sports-simulator?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-ai-royale-the-live-e-sports-simulator" 
        target="_blank" 
        rel="noopener noreferrer"
        className={cn(
          "absolute top-24 right-4 md:top-28 md:right-8 z-20 transition-all duration-700 delay-500",
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        )}
      >
        <img 
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1061174&theme=light&t=1768090726683" 
          alt="AI Royale: The Live E-Sports Simulator - The unfair advantage for Clash Royale players. 🔮 | Product Hunt" 
          width="250" 
          height="54"
          className="hover:opacity-90 transition-opacity hover:scale-105"
        />
      </a>

      <div className="relative container mx-auto px-4 py-20 md:py-24 z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge with Golden Accent - Animated entrance */}
          <div className={cn(
            "inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border border-gold/40 shadow-gold/30 shadow-lg transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}>
            <Crown className="h-5 w-5 text-gold animate-trophy-shine" />
            <span className="text-sm font-rajdhani font-bold text-gold uppercase tracking-wider">
              {t("landing.hero.titleHighlight")}
            </span>
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          
          {/* Main Heading with animated reveal */}
          <h1 className={cn(
            "text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-rajdhani tracking-tight transition-all duration-700 delay-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent animate-float drop-shadow-[0_0_40px_hsl(190,100%,50%,0.5)]">
                {t("landing.hero.title").split(' ')[0]}
              </span>
              {/* Shimmer effect on text */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] bg-clip-text animate-shimmer pointer-events-none" />
            </span>
            <br />
            <span className="text-foreground text-embossed">{t("landing.hero.title").split(' ').slice(1).join(' ')}</span>
          </h1>
          
          {/* Subheading */}
          <p className={cn(
            "text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            {t("landing.hero.subtitle")}
          </p>

          {/* Social Proof Badge */}
          <div className={cn(
            "flex items-center justify-center gap-3 text-gold transition-all duration-700 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <Trophy className="h-5 w-5 trophy-shimmer" />
            <span className="font-rajdhani font-bold text-lg">{t("landing.hero.playerCount")}</span>
            <Trophy className="h-5 w-5 trophy-shimmer" />
          </div>

          {/* CTA Card with Arena Styling */}
          <div className={cn(
            "transition-all duration-700 delay-400",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <Card variant="golden" className="max-w-xl mx-auto golden-shine">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl sm:text-2xl">
                  {user ? t("dashboard.welcome") + "!" : t("landing.hero.cta")}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {user 
                    ? t("landing.hero.manageAccounts")
                    : t("landing.hero.enterTag")
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user ? (
                  <div className="space-y-4">
                    <Button 
                      onClick={() => navigate("/select-player")}
                      variant="golden"
                      size="lg"
                      className="w-full"
                    >
                      <Users className="mr-2 h-5 w-5" />
                      {t("landing.hero.selectAccount")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="#ABC123XYZ"
                          value={playerTag}
                          onChange={(e) => setPlayerTag(e.target.value)}
                          className="h-12 text-lg bg-background/50 border-border/50 focus:border-gold focus:ring-gold/30"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        variant="golden"
                        size="lg"
                        className="px-6 sm:px-8"
                      >
                        <Zap className="mr-2 h-5 w-5" />
                        {t("landing.hero.analyze")}
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
                      <p>
                        {t("auth.noAccount")}{" "}
                        <button
                          type="button"
                          onClick={() => navigate("/auth")}
                          className="text-gold hover:text-gold/80 hover:underline font-semibold transition-colors"
                        >
                          {t("auth.signUpButton")}
                        </button>
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/demo")}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 font-semibold transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        {t("landing.hero.tryDemo")}
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scroll indicator */}
          <button 
            onClick={scrollToFeatures}
            className={cn(
              "inline-flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-all duration-500 mt-8",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: '600ms' }}
          >
            <span className="text-sm font-rajdhani">{t("landing.hero.scrollToExplore")}</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}
