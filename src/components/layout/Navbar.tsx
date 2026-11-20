import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Sparkles, HelpCircle, Play, Shield, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationCenter } from "./NotificationCenter";
import { GlobalProgressCenter } from "./GlobalProgressCenter";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { NavbarSubscriptionBadge } from "./NavbarSubscriptionBadge";
import { useAdminAccess } from "@/hooks/useAdminAccess";

import { User } from "@supabase/supabase-js";

interface NavbarProps {
  user?: User | null;
  showAuth?: boolean;
}

export function Navbar({ user, showAuth = true }: NavbarProps) {
  const navigate = useNavigate();
  const menuToggle = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { isAdmin, isModerator } = useAdminAccess();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success(t("nav.signOut"));
  };
  
  const showAdminLink = user && (isAdmin || isModerator);

  return (
    <nav className="sticky top-0 z-50 border-b border-gold/20 bg-card/90 backdrop-blur-md"
      onKeyDown={event => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuToggle.current?.focus();
        }
      }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
        <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/30 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Crown className="h-7 w-7 text-gold transition-all group-hover:scale-110 relative z-10" />
          </div>
          <span className="whitespace-nowrap text-xl font-bold font-rajdhani text-foreground">
            AI ROYALE
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          {showAuth && !user && <Button asChild size="sm" variant="golden"><Link to="/auth?mode=signup">{t("nav.getStarted")}</Link></Button>}
          <Button ref={menuToggle} id="public-menu-toggle" size="icon" variant="ghost" aria-label={t("common.navigation")}
            aria-expanded={menuOpen} aria-controls="public-menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        <div id="public-menu" className={`${menuOpen ? "flex" : "hidden"} absolute inset-x-0 top-full max-h-[75dvh] flex-wrap items-center gap-2 overflow-y-auto border-b border-border bg-card p-3 shadow-lg lg:static lg:flex lg:max-h-none lg:flex-nowrap lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <Link 
            to="/demo" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>{t("nav.demo")}</span>
          </Link>
          <Link 
            to="/help" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>{t("nav.help")}</span>
          </Link>
          {showAdminLink && (
            <Link 
              to="/admin" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-destructive hover:text-destructive/80 font-medium transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>{t('admin.navigation.admin')}</span>
            </Link>
          )}
          <LanguageSelector />
          <ThemeToggle />
          {user && (
            <>
              <NavbarSubscriptionBadge />
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
                  className="hidden lg:inline-flex"
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
