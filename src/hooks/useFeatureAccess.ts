import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { SubscriptionUserContext, useSubscription } from "./useSubscription";
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
  | 'blocked'
  | 'verification_unavailable'
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
  const { t } = useTranslation();
  const { hasAccess: hasPaidAccess, isTrialActive, isLoading: isSubLoading } = useSubscription();
  const todayDate = getTodayDateString();
  const normalizedTag = normalizePlayerTag(playerTag);
  const dailyLimit = FEATURE_LIMITS[featureName];

  const accountId = useContext(SubscriptionUserContext);
  const usageKey = ['feature-usage', accountId, featureName, normalizedTag, todayDate];
  const { data: usage, isLoading: isUsageLoading, isError: authFailed, refetch } = useQuery({
    queryKey: usageKey,
    enabled: !!accountId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== accountId) return { userId: null, count: 0 };

      const { data, error } = await supabase.rpc('get_daily_feature_usage', {
        p_user_id: user.id,
        p_feature_name: featureName,
        p_date: todayDate,
      });
      return { userId: user.id, count: error ? null : data };
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  const userId = usage?.userId;
  const usageFailed = usage?.count === null;
  const usageCount = usage?.count ?? 0;

  // Integrate fraud status for velocity checks and reduced limits
  const { 
    fraudStatus, 
    getFeatureLimit, 
    checkVelocity, 
    isSoftBlocked, 
    isWarned,
    isError: fraudFailed,
    refetch: refetchFraud,
    isLoading: isFraudLoading 
  } = useFraudStatus(userId || null);
  
  const isLoading = isSubLoading || isUsageLoading || isFraudLoading;

  // Calculate effective limit based on fraud status
  const effectiveLimit = getFeatureLimit(featureName, dailyLimit);
  
  // Calculate remaining uses based on effective limit
  const remainingUses = fraudStatus?.status === 'blocked' ? 0 : (hasPaidAccess || isTrialActive) && !isSoftBlocked
    ? Infinity
    : Math.max(0, effectiveLimit - usageCount);

  const blocked: AccessResult = { allowed: false, reason: 'blocked', message: t('subscription.accountRestricted') };
  const unavailable: AccessResult = {
    allowed: false, reason: 'verification_unavailable', message: t('subscription.verificationUnavailable'),
  };

  // Determine current access status without async checks
  const getStaticAccessResult = (): AccessResult | null => {
    if (isLoading) return null;
    if (authFailed) return unavailable;
    
    if (!userId) {
      return { allowed: false, reason: 'not_authenticated', message: 'Please sign in to use this feature.' };
    }

    if (fraudStatus?.status === 'blocked') return blocked;
    if (fraudFailed || (usageFailed && (isSoftBlocked || !hasPaidAccess))) return unavailable;

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

    if (user.id !== userId || isLoading || fraudFailed) return unavailable;
    if (fraudStatus?.status === 'blocked') return blocked;
    try {
      if (await checkVelocity({ featureName })) {
        return {
          allowed: false, reason: 'velocity_exceeded', message: 'Too many requests. Please try again in a minute.',
        };
      }
    } catch {
      return unavailable;
    }

    // Only a verified trial can create a permanent claim. Free access checks the link
    // and existing claims. A competing trial claim returns false from the database.
    if (isTrialActive || !hasPaidAccess) {
      const operation = isTrialActive ? 'claim_player_tag_for_trial' : 'is_player_tag_available_for_trial';
      const { data, error } = await supabase.rpc(operation, { p_player_tag: normalizedTag, p_user_id: user.id });
      if (error || data == null) return unavailable;
      if (!data) return {
        allowed: false, reason: 'fraud_detected',
        message: t('subscription.tagAccessUnavailable'),
      };
    }

    // Check soft-blocked status
    if (isSoftBlocked) {
      const currentLimit = getFeatureLimit(featureName, dailyLimit);
      const { data: currentUsage, error } = await supabase.rpc('get_daily_feature_usage', {
        p_user_id: user.id,
        p_feature_name: featureName,
        p_date: todayDate,
      });
      
      if (error || currentUsage == null) return unavailable;
      if (currentUsage < currentLimit) {
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

    if (usageError || currentUsage == null) return unavailable;
    if (currentUsage < currentLimit) {
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
      queryKey: usageKey
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
    refetch: () => { void refetch(); void refetchFraud(); },
    fraudStatus: fraudStatus?.status || null,
  };
}
