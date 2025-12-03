import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { MatchDiscussionProvider } from "@/contexts/MatchDiscussionContext";
import { PageLoader } from "@/components/ui/page-loader";
import { ThemeProvider } from "next-themes";

// Lazy load pages for better initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SelectPlayer = lazy(() => import("./pages/SelectPlayer"));
const Help = lazy(() => import("./pages/Help"));
const Demo = lazy(() => import("./pages/Demo"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MatchDiscussionProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/select-player" element={<SelectPlayer />} />
                  <Route path="/player/:playerTag" element={<Dashboard />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </MatchDiscussionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
