import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";
import { useFraudStatus } from "./useFraudStatus";

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
  dream_arena: 1, // Free users: 1 demo match per day
} as const;

export type FeatureName = keyof typeof FEATURE_LIMITS;

type AccessReason =
  | 'pro'              // Paid subscriber
  | 'trial'            // Active trial period
  | 'daily_free'       // Free daily usage available
  | 'fraud_detected'   // Tag claimed by another user
  | 'quota_exceeded'   // Daily limit reached
  | 'velocity_exceeded' // Rate limiting triggered
  | 'soft_blocked'     // User is soft-blocked due to fraud
  | 'not_authenticated'; // User not logged in

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  message?: string;
  reducedLimits?: boolean;
}

interface UseFeatureAccessReturn {
  canAccess: boolean;
  isLoading: boolean;
  accessResult: AccessResult | null;
  usageCount: number;
  dailyLimit: number;
  effectiveLimit: number;
  remainingUses: number;
  checkAccess: () => Promise<AccessResult>;
  logUsage: (metadata?: Record<string, string | number | boolean | null>) => Promise<void>;
  refetch: () => void;
  fraudStatus: 'clean' | 'warning' | 'soft_blocked' | 'blocked' | null;
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
  
  // Integrate fraud status for velocity checks and reduced limits
  const { 
    fraudStatus, 
    getFeatureLimit, 
    checkVelocity, 
    isSoftBlocked, 
    isWarned,
    isLoading: isFraudLoading 
  } = useFraudStatus(userId || null);
  
  const isLoading = isSubLoading || isUsageLoading || isFraudLoading;

  // Calculate effective limit based on fraud status
  const effectiveLimit = getFeatureLimit(featureName, dailyLimit);
  
  // Calculate remaining uses based on effective limit
  const remainingUses = Math.max(0, effectiveLimit - usageCount);

  // Determine current access status without async checks
  const getStaticAccessResult = (): AccessResult | null => {
    if (isLoading) return null;
    
    if (!userId) {
      return { allowed: false, reason: 'not_authenticated', message: 'Please sign in to use this feature.' };
    }

    // Check for soft-blocked users - they can still use with reduced limits
    if (isSoftBlocked) {
      if (usageCount < effectiveLimit) {
        return { 
          allowed: true, 
          reason: 'soft_blocked', 
          message: 'Your account has reduced access due to unusual activity.',
          reducedLimits: true 
        };
      }
      return { 
        allowed: false, 
        reason: 'quota_exceeded', 
        message: `Reduced limit reached (${effectiveLimit} uses per day due to account restrictions).` 
      };
    }

    // Layer 1: Pro users always have access (but still track for velocity)
    if (hasPaidAccess && !isTrialActive) {
      return { allowed: true, reason: 'pro', reducedLimits: isWarned };
    }

    // Layer 3 (partial): Trial users have access (fraud check done in checkAccess)
    if (isTrialActive) {
      return { allowed: true, reason: 'trial', reducedLimits: isWarned };
    }

    // Layer 3: Free tier quota check (with effective limit for warned users)
    if (usageCount < effectiveLimit) {
      return { allowed: true, reason: 'daily_free', reducedLimits: isWarned };
    }

    return { 
      allowed: false, 
      reason: 'quota_exceeded', 
      message: `Daily free limit reached (${effectiveLimit} uses per day). Upgrade for unlimited access.` 
    };
  };

  // Full access check including fraud detection and velocity checks (async)
  const checkAccess = async (): Promise<AccessResult> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { allowed: false, reason: 'not_authenticated', message: 'Please sign in to use this feature.' };
    }

    // Check for velocity abuse (rate limiting) - applies to all users
    try {
      const isVelocityAbuse = await checkVelocity({
        featureName,
        windowSeconds: 60,
        maxRequests: 15, // Max 15 requests per minute per feature
      });
      
      if (isVelocityAbuse) {
        return {
          allowed: false,
          reason: 'velocity_exceeded',
          message: 'Too many requests. Please slow down and try again in a minute.',
        };
      }
    } catch (error) {
      console.error('Velocity check error:', error);
      // Fail open - don't block on velocity check errors
    }

    // Check soft-blocked status
    if (isSoftBlocked) {
      const currentLimit = getFeatureLimit(featureName, dailyLimit);
      const { data: currentUsage } = await supabase.rpc('get_daily_feature_usage', {
        p_user_id: user.id,
        p_feature_name: featureName,
        p_date: todayDate,
      });
      
      if ((currentUsage || 0) < currentLimit) {
        return { 
          allowed: true, 
          reason: 'soft_blocked', 
          message: 'Your account has reduced access due to unusual activity.',
          reducedLimits: true 
        };
      }
      return {
        allowed: false,
        reason: 'quota_exceeded',
        message: `Reduced limit reached (${currentLimit} uses per day due to account restrictions).`,
      };
    }

    // Layer 1: Pro subscription check
    if (hasPaidAccess && !isTrialActive) {
      return { allowed: true, reason: 'pro', reducedLimits: isWarned };
    }

    // Layer 2: Fraud check (The Golden Rule for trial abuse)
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
      return { allowed: true, reason: 'trial', reducedLimits: isWarned };
    }

    // Layer 3: Free tier quota check (use effective limit for warned users)
    const currentLimit = getFeatureLimit(featureName, dailyLimit);
    const { data: currentUsage, error: usageError } = await supabase.rpc('get_daily_feature_usage', {
      p_user_id: user.id,
      p_feature_name: featureName,
      p_date: todayDate,
    });

    if (usageError) {
      console.error('Error fetching usage:', usageError);
      return { allowed: true, reason: 'daily_free', reducedLimits: isWarned }; // Fail open
    }

    if ((currentUsage || 0) < currentLimit) {
      return { allowed: true, reason: 'daily_free', reducedLimits: isWarned };
    }

    return {
      allowed: false,
      reason: 'quota_exceeded',
      message: `Daily free limit reached (${currentLimit} uses per day). Upgrade for unlimited access.`,
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
    effectiveLimit,
    remainingUses,
    checkAccess,
    logUsage,
    refetch,
    fraudStatus: fraudStatus?.status || null,
  };
}
