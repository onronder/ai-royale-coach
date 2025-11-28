import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, Zap, Users, Crown, Trophy } from "lucide-react";
import { toast } from "sonner";
import { DemoSection } from "@/components/landing/DemoSection";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [playerTag, setPlayerTag] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerTag.trim()) {
      toast.error("Please enter a player tag");
      return;
    }
    
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/auth");
      return;
    }

    const cleanTag = playerTag.trim().replace("#", "");
    navigate(`/player/${cleanTag}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} />

      {/* Hero Section with Arena Background */}
      <section className="relative overflow-hidden flex-1 arena-bg">
        {/* Floating Particles */}
        <div className="floating-particles">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-royal/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-arena-entrance">
            {/* Badge with Golden Accent */}
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border border-gold/40 shadow-gold/30 shadow-lg animate-golden-pulse">
              <Crown className="h-5 w-5 text-gold animate-trophy-shine" />
              <span className="text-sm font-rajdhani font-bold text-gold uppercase tracking-wider">
                {t("landing.hero.titleHighlight")}
              </span>
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            
            {/* Main Heading with Gold Outline Effect */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold font-rajdhani tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent inline-block animate-float drop-shadow-[0_0_30px_hsl(190,100%,50%,0.5)]">
                {t("landing.hero.title").split(' ')[0]}
              </span>
              <br />
              <span className="text-foreground text-embossed">{t("landing.hero.title").split(' ').slice(1).join(' ')}</span>
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t("landing.hero.subtitle")}
            </p>

            {/* Player Count Badge */}
            <div className="flex items-center justify-center gap-3 text-gold">
              <Trophy className="h-5 w-5 trophy-shimmer" />
              <span className="font-rajdhani font-bold text-lg">Join 10,000+ competitive players</span>
              <Trophy className="h-5 w-5 trophy-shimmer" />
            </div>

            {/* CTA Card with Arena Styling */}
            <Card variant="golden" className="max-w-xl mx-auto golden-shine">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {user ? t("dashboard.welcome") + "!" : t("landing.hero.cta")}
                </CardTitle>
                <CardDescription className="text-base">
                  {user 
                    ? "Select an account or add a new player tag" 
                    : "Enter your player tag to unlock AI insights"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user ? (
                  <div className="space-y-4">
                    <Button 
                      onClick={() => navigate("/select-player")}
                      variant="golden"
                      size="lg"
                      className="w-full"
                    >
                      <Users className="mr-2 h-5 w-5" />
                      Select Account
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      Manage up to 3 player accounts
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-3">
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
                        className="px-8"
                      >
                        <Zap className="mr-2 h-5 w-5" />
                        Analyze
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("auth.noAccount")}{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/auth")}
                        className="text-gold hover:text-gold/80 hover:underline font-semibold transition-colors"
                      >
                        {t("auth.signUpButton")}
                      </button>
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <FeatureShowcase />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Demo Section */}
      <DemoSection />

      <Footer />
    </div>
  );
};

export default Index;
