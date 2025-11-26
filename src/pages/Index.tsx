import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Target, TrendingUp, Sparkles, Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { DemoSection } from "@/components/landing/DemoSection";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Index = () => {
  const navigate = useNavigate();
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

      {/* Hero Section */}
      <section className="relative overflow-hidden flex-1 animated-gradient-bg">
        <div className="absolute inset-0 bg-gradient-surface"></div>
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30 shadow-glow animate-pulse-glow">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-rajdhani font-semibold text-primary uppercase tracking-wide">
                AI-Powered Coaching Platform
              </span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold font-rajdhani tracking-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent inline-block animate-float">
                DOMINATE
              </span>
              <br />
              <span className="text-foreground">THE ARENA</span>
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              AI-powered analysis, strategic insights, and personalized coaching to take your Clash Royale game to the next level
            </p>

            {/* Player Count Badge */}
            <div className="flex items-center justify-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <span className="font-rajdhani font-semibold">Join 10,000+ competitive players</span>
            </div>

            {/* CTA Card */}
            <Card className="max-w-xl mx-auto bg-card-elevated shadow-primary-glow border-primary/30 hover:border-primary/50 transition-all">
              <CardHeader>
                <CardTitle className="text-2xl font-rajdhani">Start Your Analysis</CardTitle>
                <CardDescription className="text-base">
                  Enter your player tag to unlock AI insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="#ABC123XYZ"
                        value={playerTag}
                        onChange={(e) => setPlayerTag(e.target.value)}
                        className="h-12 text-lg bg-input border-border/50 focus:border-primary"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      size="lg"
                      className="h-12 px-8 bg-gradient-primary hover:shadow-primary-glow font-rajdhani font-semibold text-base"
                    >
                      <Zap className="mr-2 h-5 w-5" />
                      Analyze
                    </Button>
                  </div>
                  {!user && (
                    <p className="text-sm text-muted-foreground">
                      New here?{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/auth")}
                        className="text-primary hover:underline font-semibold"
                      >
                        Create your free account
                      </button>
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <DemoSection />

      {/* Features Section */}
      <FeaturesSection />

      <Footer />
    </div>
  );
};

function FeaturesSection() {
  const { ref: ref1, isVisible: isVisible1 } = useScrollAnimation(0.2);
  const { ref: ref2, isVisible: isVisible2 } = useScrollAnimation(0.2);
  const { ref: ref3, isVisible: isVisible3 } = useScrollAnimation(0.2);

  return (
    <section className="py-20 bg-card/50 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-rajdhani mb-4">
            POWERED BY AI
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced machine learning algorithms analyze every aspect of your gameplay
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div ref={ref1} className={`opacity-0 ${isVisible1 ? 'animate-fade-in-up' : ''}`}>
            <Card className="group bg-card hover:bg-card-elevated transition-all hover:shadow-glow hover:-translate-y-1 border-border/50 hover:border-primary/30">
              <CardHeader className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl font-rajdhani">Smart Analysis</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Deep AI insights from your battle history, deck synergies, and win patterns
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div ref={ref2} className={`opacity-0 ${isVisible2 ? 'animate-fade-in-up' : ''}`} style={{ animationDelay: '150ms' }}>
            <Card className="group bg-card hover:bg-card-elevated transition-all hover:shadow-accent-glow hover:-translate-y-1 border-border/50 hover:border-accent/30">
              <CardHeader className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="h-7 w-7 text-accent" />
                </div>
                <CardTitle className="text-2xl font-rajdhani">Deck Optimization</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Meta-aware recommendations tailored to your playstyle and trophy range
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div ref={ref3} className={`opacity-0 ${isVisible3 ? 'animate-fade-in-up' : ''}`} style={{ animationDelay: '300ms' }}>
            <Card className="group bg-card hover:bg-card-elevated transition-all hover:shadow-victory hover:-translate-y-1 border-border/50 hover:border-success/30">
              <CardHeader className="space-y-4">
                <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-7 w-7 text-success" />
                </div>
                <CardTitle className="text-2xl font-rajdhani">Performance Tracking</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Real-time stats, win rate analytics, and progression insights over time
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Index;
