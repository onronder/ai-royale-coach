import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Crown, LogOut, Settings as SettingsIcon, Brain, CreditCard, User, ChevronRight, Sparkles, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserAIProfiles } from "@/hooks/usePlayerAIAccess";
import { AIAccountSelector } from "@/components/subscription/AIAccountSelector";
import { PricingModal } from "@/components/subscription/PricingModal";
import { DataLoader } from "@/components/ui/data-loader";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAISelector, setShowAISelector] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const { 
    hasAccess, 
    accountSlots, 
    subscriptionStatus, 
    isTrialActive,
    trialDaysRemaining,
    status,
    refetch: refetchSubscription 
  } = useSubscription();

  const { profiles, isLoading: isLoadingProfiles, refetch: refetchProfiles } = useUserAIProfiles();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success(t('dashboard.signedOut'));
  };

  const handleAISelectorComplete = () => {
    refetchSubscription();
    refetchProfiles();
  };

  const aiEnabledCount = profiles.filter(p => p.ai_enabled).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center arena-bg">
        <DataLoader context="player-profiles" variant="card" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen arena-bg relative overflow-hidden">
      {/* Floating Particles */}
      <div className="floating-particles">
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gold/20 bg-card/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Crown className="h-7 w-7 text-gold transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-gold/20 blur-lg -z-10 group-hover:bg-gold/30 transition-colors" />
            </div>
            <span className="text-xl font-bold font-rajdhani text-foreground">
              AI ROYALE
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/select-player')} className="border-border/50">
              {t('settings.backToAccounts')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="border-border/50 hover:border-destructive/50 hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.signOut')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-rajdhani text-embossed">{t('settings.title')}</h1>
              <p className="text-muted-foreground text-sm">{t('settings.subtitle')}</p>
            </div>
          </div>

          {/* Account Info */}
          <Card variant="arena">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                {t('settings.account.title')}
              </CardTitle>
              <CardDescription>{t('settings.account.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('settings.account.email')}</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('settings.account.linkedAccounts')}</span>
                <Badge variant="outline" className="border-gold/40">
                  {profiles.length} / 3
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card variant="arena">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-gold" />
                {t('settings.subscription.title')}
              </CardTitle>
              <CardDescription>{t('settings.subscription.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('settings.subscription.status')}</span>
                {hasAccess ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    {isTrialActive 
                      ? t('settings.subscription.trial', { days: trialDaysRemaining })
                      : t('settings.subscription.active')
                    }
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t('settings.subscription.inactive')}
                  </Badge>
                )}
              </div>
              
              {hasAccess && accountSlots > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{t('settings.subscription.plan')}</span>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-gold" />
                      <span className="font-medium">
                        {t('settings.subscription.proTier', { count: accountSlots })}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {status?.subscription?.currentPeriodEnd && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{t('settings.subscription.renewsOn')}</span>
                    <span className="font-medium">
                      {format(new Date(status.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                    </span>
                  </div>
                </>
              )}

              <div className="pt-2">
                {hasAccess ? (
                  accountSlots < 3 && (
                    <Button 
                      variant="outline" 
                      className="w-full border-gold/50 hover:bg-gold/10"
                      onClick={() => setShowPricingModal(true)}
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-gold" />
                      {t('settings.subscription.upgrade')}
                    </Button>
                  )
                ) : (
                  <Button 
                    variant="golden" 
                    className="w-full"
                    onClick={() => setShowPricingModal(true)}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    {t('settings.subscription.subscribe')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI-Enabled Accounts */}
          {hasAccess && accountSlots > 0 && (
            <Card variant="arena" className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-primary" />
                  {t('settings.aiAccounts.title')}
                </CardTitle>
                <CardDescription>{t('settings.aiAccounts.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Slots Summary */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div>
                    <span className="text-sm font-medium">{t('settings.aiAccounts.slotsUsed')}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('settings.aiAccounts.slotsDescription', { count: accountSlots })}
                    </p>
                  </div>
                  <Badge variant={aiEnabledCount === accountSlots ? "default" : "outline"} className="text-lg px-3 py-1">
                    {aiEnabledCount} / {accountSlots}
                  </Badge>
                </div>

                {/* AI Account List */}
                {isLoadingProfiles ? (
                  <DataLoader context="player-profiles" variant="minimal" />
                ) : (
                  <div className="space-y-2">
                    {profiles.map((profile) => (
                      <div 
                        key={profile.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          profile.ai_enabled
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/50 bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            profile.ai_enabled ? "bg-primary/20" : "bg-muted"
                          )}>
                            {profile.ai_enabled ? (
                              <Brain className="h-5 w-5 text-primary" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium">
                              {profile.player_name || `#${profile.player_tag}`}
                            </span>
                            {profile.trophies && (
                              <p className="text-xs text-muted-foreground">
                                {profile.trophies.toLocaleString()} {t('common.trophies')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={profile.ai_enabled ? "default" : "outline"}
                          className={profile.ai_enabled ? "bg-primary/20 text-primary border-primary/30" : ""}
                        >
                          {profile.ai_enabled ? t('settings.aiAccounts.enabled') : t('settings.aiAccounts.disabled')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Change AI Accounts Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowAISelector(true)}
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  {t('settings.aiAccounts.manage')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* AI Account Selector Modal */}
      <AIAccountSelector
        open={showAISelector}
        onOpenChange={setShowAISelector}
        accountSlots={accountSlots}
        onComplete={handleAISelectorComplete}
      />

      {/* Pricing Modal */}
      <PricingModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
      />
    </div>
  );
};

export default Settings;
