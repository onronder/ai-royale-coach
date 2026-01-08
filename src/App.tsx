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
import i18n from "./i18n";

// Lazy load pages for better initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SelectPlayer = lazy(() => import("./pages/SelectPlayer"));
const Settings = lazy(() => import("./pages/Settings"));
const Help = lazy(() => import("./pages/Help"));
const Demo = lazy(() => import("./pages/Demo"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Oracle = lazy(() => import("./pages/Oracle"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = createQueryClientWithMetrics();

const App = () => {
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
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/select-player" element={<SelectPlayer />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/player/:playerTag" element={<Dashboard />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="/demo" element={<Demo />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/maintenance" element={<Maintenance />} />
                      <Route path="/oracle" element={<Oracle />} />
                      <Route path="/admin" element={<Admin />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </ErrorBoundary>
            </ApiMetricsProvider>
          </MatchDiscussionProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
  );
};

export default App;
