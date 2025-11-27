import { Crown, Trophy, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
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
            <span className="font-rajdhani font-bold text-lg text-foreground">AI ROYAL</span>
          </Link>
          
          {/* Tagline */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4 text-gold/60" />
            <p className="text-sm">
              © {new Date().getFullYear()} AI Royal. <span className="text-gold/80">Elevate your gameplay.</span>
            </p>
            <Sparkles className="h-4 w-4 text-gold/60" />
          </div>
          
          {/* Links */}
          <div className="flex gap-4 text-sm">
            <a 
              href="#" 
              className="text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
            >
              Discord
            </a>
            <span className="text-border">•</span>
            <a 
              href="#" 
              className="text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
