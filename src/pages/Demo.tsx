import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { DemoSection } from "@/components/landing/DemoSection";
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

      {/* Full Demo Section */}
      <DemoSection />

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
