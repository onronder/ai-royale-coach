import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { SplashScreen } from "@/components/ui/splash-screen";
import { TrialExpiredPage } from "./TrialExpiredPage";
import { supabase } from "@/integrations/supabase/client";

interface RequireSubscriptionProps {
  children: ReactNode;
}

export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const navigate = useNavigate();
  const { hasAccess, isLoading } = useSubscription();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      // If not authenticated, redirect to auth page
      if (!session) {
        navigate('/auth');
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate('/auth');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  // Show loading while checking auth or subscription
  if (isAuthenticated === null || isLoading) {
    return <SplashScreen />;
  }
  
  // Not authenticated - will be redirected
  if (!isAuthenticated) {
    return <SplashScreen />;
  }
  
  // Authenticated and has access
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Authenticated but no access - show paywall
  return <TrialExpiredPage />;
}
