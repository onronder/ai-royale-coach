import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnboarding(userId: string | null) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        // Check if user has active subscription first - subscribers should NEVER see onboarding
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', userId)
          .maybeSingle();

        // Active subscribers skip onboarding entirely (they've already used the app)
        if (subscription?.status === 'active') {
          setShowOnboarding(false);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed_at, trial_ends_at')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setIsLoading(false);
          return;
        }

        // If onboarding already completed, don't show
        if (data?.onboarding_completed_at !== null) {
          setShowOnboarding(false);
          setIsLoading(false);
          return;
        }

        // Show onboarding only for truly new users (no completed onboarding AND just started trial)
        // If trial already expired, they're a returning user who didn't complete onboarding - still don't show
        const now = new Date();
        const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const isTrialActive = trialEndsAt && trialEndsAt > now;
        
        // Only show onboarding for new users who haven't completed it AND are currently in trial
        // This ensures returning users (expired trial or subscribed) never see it
        setShowOnboarding(data?.onboarding_completed_at === null && isTrialActive === true);
      } catch (err) {
        console.error('Error in onboarding check:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [userId]);

  const completeOnboarding = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error completing onboarding:', error);
        return;
      }

      setShowOnboarding(false);
    } catch (err) {
      console.error('Error in completeOnboarding:', err);
    }
  }, [userId]);

  const skipOnboarding = useCallback(async () => {
    // Same as complete - marks it as done so it won't show again
    await completeOnboarding();
  }, [completeOnboarding]);

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
  };
}
