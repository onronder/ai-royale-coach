import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Crown, ArrowLeft, Sparkles, Shield } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/select-player");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/select-player");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden arena-bg">
      {/* Floating Particles */}
      <div className="floating-particles">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-royal/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md space-y-6 animate-arena-entrance relative z-10">
        {/* Back to Home */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to Home</span>
        </Link>

        {/* Logo with Golden Glow */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-gold shadow-gold relative golden-shine">
            <Crown className="h-10 w-10 text-gold-foreground" />
            <div className="absolute -inset-1 bg-gold/20 rounded-2xl blur-lg -z-10" />
          </div>
          <h1 className="text-4xl font-bold font-rajdhani text-embossed">AI ROYAL</h1>
          <p className="text-muted-foreground text-sm">Your path to arena dominance</p>
        </div>

        <Card variant="arena" className="golden-shine">
          <CardHeader className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              {isSignUp ? (
                <Sparkles className="h-5 w-5 text-gold" />
              ) : (
                <Shield className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-2xl">
                {isSignUp ? "Join the Arena" : "Welcome Back"}
              </CardTitle>
            </div>
            <CardDescription>
              {isSignUp
                ? "Create your account and start dominating"
                : "Sign in to continue your journey"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 bg-background/50 border-border/50 focus:border-gold focus:ring-gold/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="h-12 bg-background/50 border-border/50 focus:border-gold focus:ring-gold/30"
                />
                {isSignUp && (
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                variant={isSignUp ? "golden" : "default"}
                size="lg"
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : isSignUp ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-gold hover:text-gold/80 hover:underline font-medium transition-colors"
                disabled={isLoading}
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secure
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>Free to use</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>No spam</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
