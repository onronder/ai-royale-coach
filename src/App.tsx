import { restoreAccountLanguage } from '@/i18n/changeLanguage';
import { SubscriptionUserContext } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { MatchDiscussionProvider } from "@/contexts/MatchDiscussionContext";
import { SplashScreen } from "@/components/ui/splash-screen";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { InstallAppPrompt } from "@/components/layout/InstallAppPrompt";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { ApiMetricsProvider } from "@/components/admin/ApiMetricsProvider";
import { createQueryClientWithMetrics } from "@/lib/queryClientWithMetrics";
import { RequireSubscription } from "@/components/subscription/RequireSubscription";
import i18n from "./i18n";

// Lazy load pages for better initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SelectPlayer = lazy(() => import("./pages/SelectPlayer"));
const Settings = lazy(() => import("./pages/Settings"));
const EmailPreferences = lazy(() => import("./pages/EmailPreferences"));
const Help = lazy(() => import("./pages/Help"));
const Demo = lazy(() => import("./pages/Demo"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Changelog = lazy(() => import("./pages/Changelog"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Oracle = lazy(() => import("./pages/Oracle"));
const Admin = lazy(() => import("./pages/Admin"));
const DreamArena = lazy(() => import("./pages/DreamArena"));

const queryClient = createQueryClientWithMetrics();

const App = () => {
  const [accountId, setAccountId] = useState<string | null | undefined>();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAccountId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (accountId) return restoreAccountLanguage(accountId);
  }, [accountId]);

  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      setI18nReady(true);
      return;
    }

    const handleInitialized = () => {
      setI18nReady(true);
    };

    i18n.on('initialized', handleInitialized);
    i18n.on('loaded', handleInitialized);

    return () => {
      i18n.off('initialized', handleInitialized);
      i18n.off('loaded', handleInitialized);
    };
  }, []);

  // Show splash screen until i18n is fully initialized
  if (!i18nReady) {
    return <SplashScreen />;
  }

  return (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SubscriptionUserContext.Provider value={accountId}>
        <TooltipProvider>
          <MatchDiscussionProvider>
            <ApiMetricsProvider>
              <ErrorBoundary>
                <InstallAppPrompt />
                <OfflineIndicator />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<SplashScreen />}>
                    <Routes>
                      {/* PUBLIC ROUTES - No subscription required */}
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="/demo" element={<Demo />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/changelog" element={<Changelog />} />
                      <Route path="/maintenance" element={<Maintenance />} />
                      {/* Signed-in only: stays reachable after a subscription ends */}
                      <Route path="/settings/email" element={<EmailPreferences />} />
                      
                      {/* PROTECTED ROUTES - Subscription required */}
                      <Route path="/select-player" element={<RequireSubscription allowReadOnlyAfterTrial><SelectPlayer /></RequireSubscription>} />
                      <Route path="/settings" element={<RequireSubscription><Settings /></RequireSubscription>} />
                      <Route path="/player/:playerTag" element={<RequireSubscription allowReadOnlyAfterTrial><Dashboard /></RequireSubscription>} />
                      <Route path="/oracle" element={<RequireSubscription><Oracle /></RequireSubscription>} />
                      <Route path="/admin" element={<RequireSubscription><Admin /></RequireSubscription>} />
                      <Route path="/arena" element={<RequireSubscription><DreamArena /></RequireSubscription>} />
                      
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </ErrorBoundary>
            </ApiMetricsProvider>
          </MatchDiscussionProvider>
        </TooltipProvider>
        </SubscriptionUserContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
  );
};

export default App;
