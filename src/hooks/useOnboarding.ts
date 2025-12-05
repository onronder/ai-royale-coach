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
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setIsLoading(false);
          return;
        }

        // Show onboarding if not completed
        setShowOnboarding(data?.onboarding_completed_at === null);
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
