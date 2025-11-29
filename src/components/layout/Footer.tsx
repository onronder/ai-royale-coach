import { Crown, Trophy, Sparkles, HelpCircle, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gold/20 bg-gradient-to-b from-card to-background mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Crown className="h-6 w-6 text-gold transition-all group-hover:scale-110" />
              <div className="absolute inset-0 bg-gold/20 blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-rajdhani font-bold text-lg text-foreground">AI ROYALE</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link 
              to="/demo" 
              className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <Play className="h-4 w-4" />
              <span className="text-sm font-semibold">{t("nav.demo")}</span>
            </Link>
            <Link 
              to="/help" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="text-sm">{t("nav.help")}</span>
            </Link>
          </div>
          
          {/* Tagline */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4 text-gold/60" />
            <p className="text-sm">
              © {new Date().getFullYear()} AI Royale. <span className="text-gold/80">{t("footer.tagline")}</span>
            </p>
            <Sparkles className="h-4 w-4 text-gold/60" />
          </div>
        </div>
      </div>
    </footer>
  );
}
