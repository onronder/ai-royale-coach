import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/50 bg-card/50 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <Crown className="h-5 w-5 text-gold transition-transform group-hover:scale-110" />
            <span className="font-rajdhani font-bold text-foreground">AI ROYALE</span>
          </Link>
          
          {/* Navigation Links */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap justify-center">
            <Link to="/demo" className="hover:text-primary transition-colors">{t("nav.demo")}</Link>
            <span className="text-border">·</span>
            <Link to="/changelog" className="hover:text-foreground transition-colors">{t("nav.changelog")}</Link>
            <span className="text-border">·</span>
            <Link to="/help" className="hover:text-foreground transition-colors">{t("nav.help")}</Link>
            <span className="text-border">·</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">{t("legal.termsOfService")}</Link>
            <span className="text-border">·</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">{t("legal.privacyPolicy")}</Link>
          </nav>
          
          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AI Royale. <span className="text-gold/80">{t("footer.tagline")}</span>
          </p>
          
          {/* Supercell Disclaimer */}
          <p className="text-xs text-muted-foreground/60 text-center max-w-3xl leading-relaxed">
            {t("legal.supercellDisclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
