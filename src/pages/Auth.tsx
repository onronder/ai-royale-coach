import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Crown, ArrowLeft, Sparkles, Shield } from "lucide-react";
import GoogleIcon from "@/components/icons/GoogleIcon";

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
  
  // Google OAuth terms modal state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [oauthTermsAccepted, setOauthTermsAccepted] = useState(false);
  const [pendingOAuthUser, setPendingOAuthUser] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if terms are accepted for OAuth users
        const { data: profile } = await supabase
          .from('profiles')
          .select('terms_accepted_at')
          .eq('id', session.user.id)
          .single();
        
        if (!profile?.terms_accepted_at) {
          // Show terms modal for OAuth users who haven't accepted
          setPendingOAuthUser(session.user.id);
          setShowTermsModal(true);
        } else {
          navigate("/select-player");
        }
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check terms acceptance
        const { data: profile } = await supabase
          .from('profiles')
          .select('terms_accepted_at')
          .eq('id', session.user.id)
          .single();
        
        if (!profile?.terms_accepted_at) {
          setPendingOAuthUser(session.user.id);
          setShowTermsModal(true);
        } else {
          navigate("/select-player");
        }
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
          
          // Send branded welcome email (fire and forget - don't block signup)
          supabase.functions.invoke('send-email', {
            body: {
              email: data.user.email,
              type: 'welcome',
              language: i18n.language,
            }
          }).catch(err => console.error('Welcome email failed:', err));
        }
        
        toast.success(t("auth.welcomeNewUser"));
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || t("common.error"));
      setIsLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!oauthTermsAccepted || !pendingOAuthUser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
        })
        .eq('id', pendingOAuthUser);
      
      if (error) throw error;
      
      setShowTermsModal(false);
      setPendingOAuthUser(null);
      toast.success(t("auth.welcomeBack"));
      navigate("/select-player");
    } catch (error: any) {
      toast.error(error.message || t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTerms = async () => {
    // Sign out the user if they cancel terms
    await supabase.auth.signOut();
    setShowTermsModal(false);
    setPendingOAuthUser(null);
    setOauthTermsAccepted(false);
    toast.error(t("auth.termsRequired"));
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
          <CardContent className="space-y-5">
            {/* Google Sign-in Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}
              {t("auth.continueWithGoogle")}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("auth.orContinueWith")}
                </span>
              </div>
            </div>

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
                  autoComplete={isSignUp ? "new-password" : "current-password"}
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

      {/* OAuth Terms Acceptance Modal */}
      <Dialog open={showTermsModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gold" />
              {t("auth.termsModalTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("auth.termsModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-background/50 border border-border/50">
              <Checkbox
                id="oauth-terms"
                checked={oauthTermsAccepted}
                onCheckedChange={(checked) => setOauthTermsAccepted(checked as boolean)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <Label htmlFor="oauth-terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
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
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancelTerms}
                disabled={isLoading}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="golden"
                className="flex-1"
                onClick={handleAcceptTerms}
                disabled={!oauthTermsAccepted || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {t("auth.acceptAndContinue")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
