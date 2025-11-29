import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ValueHighlights } from "@/components/landing/ValueHighlights";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TrustSection } from "@/components/landing/TrustSection";
import { DemoTeaser } from "@/components/landing/DemoTeaser";
import { FinalCTA } from "@/components/landing/FinalCTA";

const Index = () => {
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

      {/* Hero Section - Full Impact First Impression */}
      <HeroSection user={user} />

      {/* Value Highlights - Quick benefits strip */}
      <ValueHighlights />

      {/* Feature Showcase - Detailed features */}
      <FeatureShowcase />

      {/* How It Works - User journey */}
      <HowItWorks />

      {/* Trust & Social Proof */}
      <TrustSection />

      {/* Demo Teaser - Preview with link to full demo */}
      <DemoTeaser />

      {/* Final CTA - Closing conversion opportunity */}
      <FinalCTA />

      <Footer />
    </div>
  );
};

export default Index;
