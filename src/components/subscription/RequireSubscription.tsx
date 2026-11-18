import { FirstValueEntry } from '@/components/coaching/FirstValueEntry';
import { PaymentRecovery } from './PaymentRecovery';
import { observeTrialStep } from '@/lib/trialObservation';
import { coachingReturnTag } from '@/lib/coachingReturnTag';
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { SplashScreen } from "@/components/ui/splash-screen";
import { TrialExpiredPage } from "./TrialExpiredPage";
import { TrialEndedBanner } from "./TrialEndedBanner";
import { supabase } from "@/integrations/supabase/client";

interface RequireSubscriptionProps {
  children: ReactNode;
  /** Let users whose Polar trial/subscription ended view saved results read-only. */
  allowReadOnlyAfterTrial?: boolean;
}

export function RequireSubscription({ children, allowReadOnlyAfterTrial = false }: RequireSubscriptionProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const tag = coachingReturnTag(new URLSearchParams(location.search).get('coaching'));
  const authPath = location.pathname === '/select-player' && tag ? '/auth?coaching=' + tag : '/auth';
  const { hasAccess, isLoading, subscriptionStatus, hasUsedTrial } = useSubscription();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      // If not authenticated, redirect to auth page
      if (!session) {
        navigate(authPath);
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate(authPath);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate, authPath]);
  
  useEffect(() => {
    if (isAuthenticated && !isLoading && subscriptionStatus && subscriptionStatus !== 'active' && allowReadOnlyAfterTrial) {
      observeTrialStep('app_opened');
    }
  }, [isAuthenticated, isLoading, subscriptionStatus, allowReadOnlyAfterTrial, location.pathname]);

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
  
  if (subscriptionStatus === 'past_due') {
    return allowReadOnlyAfterTrial ? <><PaymentRecovery />{children}</> : <TrialExpiredPage canStartTrial={false} paymentDue />;
  }

  if (allowReadOnlyAfterTrial && subscriptionStatus) {
    return (<><TrialEndedBanner />{children}</>);
  }

  if ((location.pathname === '/select-player' || location.pathname.startsWith('/player/')) &&
      !hasUsedTrial && !subscriptionStatus && !new URLSearchParams(location.search).has('skipFirstValue')) {
    return <FirstValueEntry playerTag={coachingReturnTag(location.pathname.split('/')[2] || null)} />;
  }

  // Authenticated but no access - show paywall
  return <TrialExpiredPage canStartTrial={!hasUsedTrial && !subscriptionStatus} />;
}
