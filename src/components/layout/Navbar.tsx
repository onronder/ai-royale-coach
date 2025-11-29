import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Sparkles, HelpCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationCenter } from "./NotificationCenter";
import { GlobalProgressCenter } from "./GlobalProgressCenter";
import { LanguageSelector } from "./LanguageSelector";

interface NavbarProps {
  user?: any;
  showAuth?: boolean;
}

export function Navbar({ user, showAuth = true }: NavbarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success(t("nav.signOut"));
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gold/20 bg-card/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/30 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Crown className="h-7 w-7 text-gold transition-all group-hover:scale-110 relative z-10" />
          </div>
          <span className="text-xl font-bold font-rajdhani text-foreground">
            AI ROYALE
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link 
            to="/demo" 
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav.demo")}</span>
          </Link>
          <Link 
            to="/help" 
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav.help")}</span>
          </Link>
          <LanguageSelector />
          {user && (
            <>
              <GlobalProgressCenter />
              <NotificationCenter />
            </>
          )}
          {showAuth && (
            user ? (
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-border/50 hover:border-destructive/50 hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("nav.signOut")}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/auth?mode=signin")}
                  className="border-border/50"
                >
                  {t("nav.signIn")}
                </Button>
                <Button 
                  variant="golden" 
                  size="sm" 
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("nav.getStarted")}
                </Button>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
