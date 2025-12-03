import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Crown, ArrowLeft, Sparkles, Shield } from "lucide-react";

const TERMS_VERSION = "1.0";

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

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
    
    if (isSignUp && !termsAccepted) {
      toast.error(t("auth.termsRequired"));
      return;
    }
    
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        // Update profile with terms acceptance
        if (data.user) {
          await supabase
            .from('profiles')
            .update({
              terms_accepted_at: new Date().toISOString(),
              terms_version: TERMS_VERSION,
            })
            .eq('id', data.user.id);
        }
        
        toast.success(t("auth.checkEmail"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success(t("auth.welcomeBack"));
      }
    } catch (error: any) {
      toast.error(error.message || t("common.error"));
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
          <span className="text-sm">{t("auth.backToHome")}</span>
        </Link>

        {/* Logo with Golden Glow */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-gold shadow-gold relative golden-shine">
            <Crown className="h-10 w-10 text-gold-foreground" />
            <div className="absolute -inset-1 bg-gold/20 rounded-2xl blur-lg -z-10" />
          </div>
          <h1 className="text-4xl font-bold font-rajdhani text-embossed">AI ROYALE</h1>
          <p className="text-muted-foreground text-sm">{t("auth.tagline")}</p>
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
                {isSignUp ? t("auth.joinArena") : t("auth.welcomeBackTitle")}
              </CardTitle>
            </div>
            <CardDescription>
              {isSignUp
                ? t("auth.createAccountDesc")
                : t("auth.signInDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 bg-background/50 border-border/50 focus:border-gold focus:ring-gold/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t("auth.password")}</Label>
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
                    {t("auth.minCharacters")}
                  </p>
                )}
              </div>
              
              {/* Terms Acceptance - Only for Sign Up */}
              {isSignUp && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-background/30 border border-border/50">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    disabled={isLoading}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    {t("auth.agreeToTerms")}{" "}
                    <Link 
                      to="/terms" 
                      target="_blank" 
                      className="text-primary hover:underline font-medium"
                    >
                      {t("legal.termsOfService")}
                    </Link>
                    {" "}{t("legal.and")}{" "}
                    <Link 
                      to="/privacy" 
                      target="_blank" 
                      className="text-primary hover:underline font-medium"
                    >
                      {t("legal.privacyPolicy")}
                    </Link>
                  </Label>
                </div>
              )}
              
              <Button 
                type="submit" 
                variant={isSignUp ? "golden" : "default"}
                size="lg"
                className="w-full" 
                disabled={isLoading || (isSignUp && !termsAccepted)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.pleaseWait")}
                  </>
                ) : isSignUp ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("auth.signUpButton")}
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    {t("auth.signInButton")}
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
                  ? t("auth.hasAccountLink")
                  : t("auth.noAccountLink")}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {t("auth.secure")}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>{t("auth.freeToUse")}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>{t("auth.noSpam")}</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
