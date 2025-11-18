import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Target, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-surface"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Coaching</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Level Up Your
              </span>
              <br />
              <span className="text-foreground">Clash Royale Game</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get personalized AI coaching, deck analysis, and strategic insights to dominate the arena
            </p>

            <Card className="bg-card-elevated shadow-glow border-primary/20">
              <CardHeader>
                <CardTitle className="text-center">Enter Your Player Tag</CardTitle>
                <CardDescription className="text-center">
                  Find your tag in-game: Profile → Settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="#ABC123XYZ"
                    value={playerTag}
                    onChange={(e) => setPlayerTag(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" className="bg-gradient-primary hover:shadow-glow">
                    Analyze
                  </Button>
                </form>
                {!user && (
                  <div className="mt-4 text-center">
                    <Button variant="link" onClick={() => navigate("/auth")}>
                      Sign in to get started
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-card hover:bg-card-elevated transition-colors">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Smart Analysis</CardTitle>
              <CardDescription>
                AI-powered insights from your battle history and deck composition
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card hover:bg-card-elevated transition-colors">
            <CardHeader>
              <Target className="h-12 w-12 text-accent mb-4" />
              <CardTitle>Deck Optimization</CardTitle>
              <CardDescription>
                Get personalized deck recommendations based on your playstyle
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card hover:bg-card-elevated transition-colors">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-success mb-4" />
              <CardTitle>Performance Tracking</CardTitle>
              <CardDescription>
                Track your progress and win rate improvements over time
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
