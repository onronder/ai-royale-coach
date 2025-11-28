import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Crown, LogOut, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerTagSelector } from "@/components/player/PlayerTagSelector";
import { toast } from "sonner";

const SelectPlayer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSelectPlayer = (playerTag: string) => {
    navigate(`/player/${playerTag}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center arena-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold/30 border-t-gold"></div>
            <Crown className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-gold" />
          </div>
          <span className="text-muted-foreground font-rajdhani">{t('common.loading')}</span>
        </div>
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
        <span></span>
        <span></span>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-gold/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />

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
            <span className="text-sm text-muted-foreground hidden sm:inline px-3 py-1.5 rounded-full bg-card border border-border/50">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="border-border/50 hover:border-destructive/50 hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.signOut')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-2xl mx-auto animate-arena-entrance">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/20 border border-gold/30 mb-4">
              <Trophy className="h-4 w-4 text-gold trophy-shimmer" />
              <span className="text-sm font-rajdhani font-semibold text-gold uppercase">{t('selectPlayer.badge')}</span>
              <Sparkles className="h-3 w-3 text-gold" />
            </div>
            <h1 className="text-3xl font-bold font-rajdhani text-embossed mb-2">{t('selectPlayer.title')}</h1>
            <p className="text-muted-foreground">{t('selectPlayer.subtitle')}</p>
          </div>

          <PlayerTagSelector 
            userId={user.id} 
            onSelect={handleSelectPlayer}
          />
        </div>
      </main>
    </div>
  );
};

export default SelectPlayer;
