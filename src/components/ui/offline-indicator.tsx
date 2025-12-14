import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if we're back online
    if (navigator.onLine) {
      setIsOffline(false);
    }
    setIsRetrying(false);
  };

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, hsl(var(--primary)) 2px, transparent 0)`,
          backgroundSize: "50px 50px"
        }} />
      </div>

      <div className="relative z-10 text-center px-4 max-w-md mx-auto">
        {/* Animated Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-destructive/30 blur-2xl animate-pulse" />
            <div className="relative p-8 rounded-full bg-destructive/10 border-2 border-destructive/40">
              <WifiOff className="w-16 h-16 text-destructive animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-rajdhani font-bold text-foreground mb-4">
          {t('offline.title', 'No Connection')}
        </h2>

        {/* Description */}
        <p className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto">
          {t('offline.description', 'It looks like you\'ve lost your internet connection. Please check your network and try again.')}
        </p>

        {/* Retry Button */}
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          size="lg"
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-rajdhani font-semibold"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              {t('offline.checking', 'Checking...')}
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              {t('offline.retry', 'Try Again')}
            </>
          )}
        </Button>

        {/* Help Text */}
        <p className="mt-8 text-sm text-muted-foreground">
          {t('offline.helpText', 'The app will reconnect automatically when your connection is restored.')}
        </p>
      </div>
    </div>
  );
}
