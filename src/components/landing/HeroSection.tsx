import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Sparkles, Zap, Users, Trophy, ChevronDown, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  user: any;
}

export function HeroSection({ user }: HeroSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [playerTag, setPlayerTag] = useState("");
  const [isVisible, setIsVisible] = useState(false);

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
    <section className="relative min-h-[90vh] flex items-center overflow-hidden arena-bg">
      {/* Animated background layers for parallax effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep background glow */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-royal/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/3 rounded-full blur-[120px]" />
        
        {/* Floating particles */}
        <div className="floating-particles">
          <span style={{ animationDelay: '0s' }}></span>
          <span style={{ animationDelay: '0.5s' }}></span>
          <span style={{ animationDelay: '1s' }}></span>
          <span style={{ animationDelay: '1.5s' }}></span>
          <span style={{ animationDelay: '2s' }}></span>
        </div>

        {/* Floating card silhouettes */}
        <div className="absolute top-20 left-[10%] w-16 h-20 rounded-lg bg-gradient-to-br from-gold/10 to-transparent border border-gold/10 animate-float opacity-30" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-[15%] w-12 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/10 animate-float opacity-30" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-[20%] w-14 h-18 rounded-lg bg-gradient-to-br from-royal/10 to-transparent border border-royal/10 animate-float opacity-30" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-[10%] w-10 h-14 rounded-lg bg-gradient-to-br from-emerald/10 to-transparent border border-emerald/10 animate-float opacity-30" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Vignette overlay for dramatic effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_100%)] opacity-50 pointer-events-none" />

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
