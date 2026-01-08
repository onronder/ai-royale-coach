import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";

// Daily limits for each premium feature (for free/expired users)
export const FEATURE_LIMITS = {
  ai_coach: 5,
  deck_analysis: 3,
  deck_advanced_analysis: 2,
  match_analysis: 5,
  player_analysis: 2,
  matchup_prediction: 3,
  card_tips: 5,
  card_replacement: 3,
  deck_performance: 3,
  meta_trends: 2,
  deck_builder: 3,
  recommend_deck: 3,
  oracle: 3,
} as const;

export type FeatureName = keyof typeof FEATURE_LIMITS;

type AccessReason =
  | 'pro'              // Paid subscriber
  | 'trial'            // Active trial period
  | 'daily_free'       // Free daily usage available
  | 'fraud_detected'   // Tag claimed by another user
  | 'quota_exceeded'   // Daily limit reached
  | 'not_authenticated'; // User not logged in

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  message?: string;
}

interface UseFeatureAccessReturn {
  canAccess: boolean;
  isLoading: boolean;
  accessResult: AccessResult | null;
  usageCount: number;
  dailyLimit: number;
  remainingUses: number;
  checkAccess: () => Promise<AccessResult>;
  logUsage: (metadata?: Record<string, string | number | boolean | null>) => Promise<void>;
  refetch: () => void;
}

function normalizePlayerTag(tag: string): string {
  return tag.replace('#', '').toUpperCase();
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function useFeatureAccess(
  featureName: FeatureName,
  playerTag: string
): UseFeatureAccessReturn {
  const queryClient = useQueryClient();
  const { hasAccess: hasPaidAccess, isTrialActive, isLoading: isSubLoading } = useSubscription();
  const todayDate = getTodayDateString();
  const normalizedTag = normalizePlayerTag(playerTag);
  const dailyLimit = FEATURE_LIMITS[featureName];

  // Query for today's usage count
  const { data: usageData, isLoading: isUsageLoading, refetch } = useQuery({
    queryKey: ['feature-usage', featureName, normalizedTag, todayDate],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { usageCount: 0, userId: null };

      const { data, error } = await supabase.rpc('get_daily_feature_usage', {
        p_user_id: user.id,
        p_feature_name: featureName,
        p_date: todayDate,
      });

      if (error) {
        console.error('Error fetching feature usage:', error);
        return { usageCount: 0, userId: user.id };
      }

      return { usageCount: data || 0, userId: user.id };
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  const usageCount = usageData?.usageCount ?? 0;
  const userId = usageData?.userId;
  const isLoading = isSubLoading || isUsageLoading;

  // Calculate remaining uses for free tier
  const remainingUses = Math.max(0, dailyLimit - usageCount);

  // Determine current access status without async checks
  const getStaticAccessResult = (): AccessResult | null => {
    if (isLoading) return null;
    
    if (!userId) {
      return { allowed: false, reason: 'not_authenticated', message: 'Please sign in to use this feature.' };
    }

    // Layer 1: Pro users always have access
    if (hasPaidAccess && !isTrialActive) {
      return { allowed: true, reason: 'pro' };
    }

    // Layer 3 (partial): Trial users have access (fraud check done in checkAccess)
    if (isTrialActive) {
      return { allowed: true, reason: 'trial' };
    }

    // Layer 3: Free tier quota check
    if (usageCount < dailyLimit) {
      return { allowed: true, reason: 'daily_free' };
    }

    return { 
      allowed: false, 
      reason: 'quota_exceeded', 
      message: `Daily free limit reached (${dailyLimit} uses per day). Upgrade for unlimited access.` 
    };
  };

  // Full access check including fraud detection (async)
  const checkAccess = async (): Promise<AccessResult> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { allowed: false, reason: 'not_authenticated', message: 'Please sign in to use this feature.' };
    }

    // Layer 1: Pro subscription check
    if (hasPaidAccess && !isTrialActive) {
      return { allowed: true, reason: 'pro' };
    }

    // Layer 2: Fraud check (The Golden Rule)
    const { data: isAvailable, error: availError } = await supabase.rpc('is_player_tag_available_for_trial', {
      p_player_tag: normalizedTag,
      p_user_id: user.id,
    });

    if (availError) {
      console.error('Error checking tag availability:', availError);
      // Fail open for errors - allow access but log the issue
    } else if (!isAvailable) {
      return {
        allowed: false,
        reason: 'fraud_detected',
        message: 'This player tag was claimed by another account during their trial period.',
      };
    }

    // Claim the tag for this user (if not already claimed)
    const { error: claimError } = await supabase.rpc('claim_player_tag_for_trial', {
      p_player_tag: normalizedTag,
      p_user_id: user.id,
    });

    if (claimError) {
      console.error('Error claiming player tag:', claimError);
    }

    // Layer 3: Trial check
    if (isTrialActive) {
      return { allowed: true, reason: 'trial' };
    }

    // Layer 3: Free tier quota check
    const { data: currentUsage, error: usageError } = await supabase.rpc('get_daily_feature_usage', {
      p_user_id: user.id,
      p_feature_name: featureName,
      p_date: todayDate,
    });

    if (usageError) {
      console.error('Error fetching usage:', usageError);
      return { allowed: true, reason: 'daily_free' }; // Fail open
    }

    if ((currentUsage || 0) < dailyLimit) {
      return { allowed: true, reason: 'daily_free' };
    }

    return {
      allowed: false,
      reason: 'quota_exceeded',
      message: `Daily free limit reached (${dailyLimit} uses per day). Upgrade for unlimited access.`,
    };
  };

  // Log feature usage after successful use
  const logUsage = async (metadata: Record<string, string | number | boolean | null> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('daily_usage_logs').insert([{
      user_id: user.id,
      player_tag: normalizedTag,
      feature_name: featureName,
      metadata,
    }]);

    if (error) {
      console.error('Error logging feature usage:', error);
    }

    // Invalidate usage query to update count
    queryClient.invalidateQueries({ 
      queryKey: ['feature-usage', featureName, normalizedTag, todayDate] 
    });
  };

  const accessResult = getStaticAccessResult();

  return {
    canAccess: accessResult?.allowed ?? false,
    isLoading,
    accessResult,
    usageCount,
    dailyLimit,
    remainingUses,
    checkAccess,
    logUsage,
    refetch,
  };
}
