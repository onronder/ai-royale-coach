import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Home, Search, ArrowLeft, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | AI Royale</title>
        <meta name="description" content="The page you're looking for doesn't exist. Return to AI Royale to continue your Clash Royale coaching journey." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center bg-background arena-bg relative overflow-hidden">
        {/* Floating Particles */}
        <div className="floating-particles">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 opacity-20 animate-float">
          <Crown className="w-16 h-16 text-gold" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20 animate-float" style={{ animationDelay: "1s" }}>
          <Sparkles className="w-12 h-12 text-primary" />
        </div>

        <div className="text-center px-4 max-w-lg relative z-10">
          {/* 404 Number with Arena Styling */}
          <div className="relative mb-8">
            <h1 className="text-[150px] md:text-[200px] font-rajdhani font-black text-transparent bg-clip-text bg-gradient-primary leading-none tracking-tight">
              404
            </h1>
            <div className="absolute inset-0 text-[150px] md:text-[200px] font-rajdhani font-black text-primary/10 blur-xl leading-none tracking-tight">
              404
            </div>
          </div>

          {/* Crown Icon */}
          <div className="mb-6 flex justify-center">
            <div className="p-6 rounded-full bg-primary/10 border-2 border-primary/30 shadow-glow animate-pulse-glow">
              <Search className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-rajdhani font-bold text-foreground mb-4">
            {t('notFound.title')}
          </h2>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            {t('notFound.description', 'The arena you\'re looking for has vanished into the void. Let\'s get you back to the battle!')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-rajdhani font-semibold"
            >
              <Link to="/">
                <Home className="w-5 h-5 mr-2" />
                {t('notFound.returnHome')}
              </Link>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="border-primary/30 hover:bg-primary/10 font-rajdhani font-semibold"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('notFound.goBack', 'Go Back')}
            </Button>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-4">
              {t('notFound.helpfulLinks', 'Helpful links:')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link 
                to="/demo" 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {t('nav.demo')}
              </Link>
              <Link 
                to="/help" 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {t('nav.help')}
              </Link>
              <Link 
                to="/auth" 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {t('nav.signIn')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
