import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppPrompt() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      return; // Don't show prompt if already installed
    }

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show prompt after a delay
    if (isIOSDevice && isMobile) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome, listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  if (!isVisible || !isMobile) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 safe-area-top">
      <div className="bg-primary text-primary-foreground px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{t('installApp.title')}</p>
              <p className="text-xs opacity-80 truncate">{t('installApp.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="min-h-[44px] bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={handleInstallClick}
            >
              {isIOS ? t('installApp.howToInstall') : t('installApp.install')}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="min-h-[44px] min-w-[44px] hover:bg-primary-foreground/20"
              onClick={handleDismiss}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* iOS Instructions */}
        {showIOSInstructions && isIOS && (
          <div className="mt-3 pt-3 border-t border-primary-foreground/20">
            <p className="text-sm font-medium mb-2">{t('installApp.iosTitle')}</p>
            <ol className="text-xs space-y-2 opacity-90">
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px] font-bold">1</span>
                <span className="flex items-center gap-1">
                  <Share className="h-4 w-4 inline" /> {t('installApp.iosStep1')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px] font-bold">2</span>
                <span className="flex items-center gap-1">
                  <Plus className="h-4 w-4 inline" /> {t('installApp.iosStep2')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>{t('installApp.iosStep3')}</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
