import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock, Crown, Zap, Target, Users, LogOut, HelpCircle, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PricingModal } from "./PricingModal";
import { cn } from "@/lib/utils";

export function TrialExpiredPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPricing, setShowPricing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    navigate("/");
  };

  const features = [
    {
      icon: Zap,
      title: t("subscription.paywall.features.aiCoach", "Personal AI Coach"),
      description: t("subscription.paywall.features.aiCoachDesc", "Get real-time strategy advice tailored to your playstyle"),
    },
    {
      icon: Target,
      title: t("subscription.paywall.features.deckAnalysis", "Deep Deck Analysis"),
      description: t("subscription.paywall.features.deckAnalysisDesc", "Optimize your decks with AI-powered insights"),
    },
    {
      icon: Crown,
      title: t("subscription.paywall.features.matchPredictions", "Match Predictions"),
      description: t("subscription.paywall.features.matchPredictionsDesc", "Know your win probability against any deck"),
    },
    {
      icon: Users,
      title: t("subscription.paywall.features.multiAccount", "Multi-Account Support"),
      description: t("subscription.paywall.features.multiAccountDesc", "Track up to 3 player accounts"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      {/* Header with public links */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="AI Royale" className="h-8 w-8" />
            <span className="font-bold text-lg">AI Royale</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/help")} className="gap-1.5">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.help", "Help")}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/terms")} className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("footer.terms", "Terms")}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/privacy")} className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t("footer.privacy", "Privacy")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Lock icon and title */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive/30 mx-auto">
              <Lock className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold">
              {t("subscription.paywall.title", "Subscription Required")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              {t("subscription.paywall.subtitle", "AI Royale requires an active subscription to access all features")}
            </p>
          </div>

          {/* Features card */}
          <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-gold" />
                {t("subscription.paywall.features.title", "What's Included")}
              </CardTitle>
              <CardDescription>
                {t("subscription.paywall.features.subtitle", "Unlock the full power of AI Royale")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg",
                    "bg-muted/50 border border-border/50"
                  )}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => setShowPricing(true)}
              className="gap-2 bg-gradient-to-r from-gold to-gold/80 hover:from-gold/90 hover:to-gold/70 text-black font-bold px-8"
            >
              <Zap className="h-5 w-5" />
              {t("subscription.paywall.startTrial", "Start 3-Day Free Trial")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowPricing(true)}
              className="gap-2 border-primary/30 hover:bg-primary/10"
            >
              <Crown className="h-5 w-5" />
              {t("subscription.paywall.subscribe", "Subscribe Now")}
            </Button>
          </div>

          {/* Sign out option */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              {t("subscription.paywall.signOut", "Sign Out")}
            </Button>
          </div>
        </div>
      </main>

      <PricingModal open={showPricing} onOpenChange={setShowPricing} />
    </div>
  );
}
