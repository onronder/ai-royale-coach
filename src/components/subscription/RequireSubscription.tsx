import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { SplashScreen } from "@/components/ui/splash-screen";
import { TrialExpiredPage } from "./TrialExpiredPage";

interface RequireSubscriptionProps {
  children: ReactNode;
}

export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const { hasAccess, isLoading } = useSubscription();
  
  if (isLoading) {
    return <SplashScreen />;
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // No access - show paywall
  return <TrialExpiredPage />;
}
