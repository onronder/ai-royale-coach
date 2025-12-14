import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Wrench, Crown, Sparkles, Clock, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Maintenance = () => {
  const { t } = useTranslation();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <Helmet>
        <title>{t('maintenance.title', 'Under Maintenance')} - AI Royale</title>
        <meta name="description" content="AI Royale is currently under maintenance. We'll be back shortly with improvements!" />
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
        <div className="absolute top-20 right-10 opacity-20 animate-float" style={{ animationDelay: "0.5s" }}>
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute bottom-20 left-10 opacity-20 animate-float" style={{ animationDelay: "1s" }}>
          <Sparkles className="w-10 h-10 text-gold" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20 animate-float" style={{ animationDelay: "1.5s" }}>
          <Crown className="w-14 h-14 text-primary" />
        </div>

        <div className="text-center px-4 max-w-lg relative z-10">
          {/* Animated Wrench Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gold/30 blur-2xl animate-pulse-glow" />
              <div className="relative p-8 rounded-full bg-gradient-to-br from-gold/20 to-primary/20 border-2 border-gold/40 shadow-glow">
                <Wrench className="w-16 h-16 text-gold animate-spin" style={{ animationDuration: "3s" }} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-rajdhani font-bold text-foreground mb-4">
            {t('maintenance.title', 'Under Maintenance')}
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            {t('maintenance.description', 'We\'re upgrading the arena with new features and improvements. The battle will resume shortly!')}
          </p>

          {/* Status Cards */}
          <div className="grid gap-4 mb-8">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="p-3 rounded-full bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-rajdhani font-semibold text-foreground">
                  {t('maintenance.estimatedTime', 'Estimated Time')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('maintenance.timeEstimate', 'Usually less than 30 minutes')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="p-3 rounded-full bg-gold/10">
                <Bell className="w-6 h-6 text-gold" />
              </div>
              <div className="text-left">
                <h3 className="font-rajdhani font-semibold text-foreground">
                  {t('maintenance.stayUpdated', 'Stay Updated')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('maintenance.followUs', 'Follow us on social media for updates')}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleRefresh}
            size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-rajdhani font-semibold"
          >
            {t('maintenance.tryAgain', 'Try Again')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Footer Note */}
          <p className="mt-8 text-sm text-muted-foreground">
            {t('maintenance.apology', 'We apologize for any inconvenience. Your progress is safe!')}
          </p>
        </div>
      </div>
    </>
  );
};

export default Maintenance;
