import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { DemoSection } from "@/components/landing/DemoSection";
import { AIFeaturesShowcase } from "@/components/landing/AIFeaturesShowcase";
import { DemoExplainer } from "@/components/landing/DemoExplainer";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, ArrowRight, Zap, Play } from "lucide-react";

const Demo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Interactive Demo - AI Royale | Try AI Coaching Free</title>
        <meta name="description" content="Experience AI Royale's powerful features without an account. Try deck analysis, matchup predictions, and AI coaching for Clash Royale." />
        <link rel="canonical" href="https://ai-royale.com/demo" />
        <meta property="og:title" content="Interactive Demo - AI Royale" />
        <meta property="og:description" content="Experience AI Royale's powerful features without an account. Try deck analysis, matchup predictions, and AI coaching." />
        <meta property="og:url" content="https://ai-royale.com/demo" />
        <meta property="og:image" content="https://ai-royale.com/og-demo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:image" content="https://ai-royale.com/og-demo.png" />
      </Helmet>
      <Navbar user={user} />

      {/* Demo Page Hero */}
      <section className="relative py-16 md:py-20 arena-bg overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-royal/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-arena-entrance">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
              <Play className="h-4 w-4 text-primary" />
              <span className="text-sm font-rajdhani font-semibold text-primary uppercase tracking-wider">
                {t("landing.demoPage.badge")}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-rajdhani">
              <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                {t("landing.demoPage.title")}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("landing.demoPage.subtitle")}
            </p>

            {/* CTA Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 border border-gold/30">
                <Sparkles className="h-4 w-4 text-gold" />
                <span className="text-sm text-gold font-rajdhani">
                  {t("landing.demoPage.noAccountNeeded")}
                </span>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                variant="golden"
                size="lg"
              >
                <Zap className="mr-2 h-5 w-5" />
                {t("landing.demoPage.getPersonalized")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Showcase - NEW */}
      <AIFeaturesShowcase />

      {/* Interactive Demo Section */}
      <DemoSection />

      {/* What You Just Saw Explainer - NEW */}
      <DemoExplainer />

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background to-card/50 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/20 border border-gold/30">
              <Crown className="h-4 w-4 text-gold" />
              <span className="text-sm font-rajdhani font-semibold text-gold uppercase tracking-wider">
                {t("landing.demoPage.readyBadge")}
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold font-rajdhani text-foreground">
              {t("landing.demoPage.ctaTitle")}
            </h2>

            <p className="text-lg text-muted-foreground">
              {t("landing.demoPage.ctaSubtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => navigate("/auth")}
                variant="golden"
                size="lg"
                className="min-w-[200px]"
              >
                <Zap className="mr-2 h-5 w-5" />
                {t("landing.demoPage.startFree")}
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                size="lg"
              >
                {t("landing.demoPage.backToHome")}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {t("landing.demoPage.noCreditCard")}
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Demo;
