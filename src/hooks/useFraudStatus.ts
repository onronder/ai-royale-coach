import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceFingerprint } from './useDeviceFingerprint';
import { useEffect } from 'react';

export type FraudStatus = 'clean' | 'warning' | 'soft_blocked' | 'blocked';

export interface UserFraudStatus {
  user_id: string;
  fraud_score: number;
  status: FraudStatus;
  signals_count: number;
  last_signal_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  feature_limits: Record<string, number>;
}

export interface FraudSignal {
  id: string;
  user_id: string;
  signal_type: string;
  severity: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  fingerprint_hash: string | null;
  player_tag: string | null;
  created_at: string;
}

/**
 * Hook to fetch and manage user's fraud status.
 * Automatically logs device fingerprint on mount.
 */
export function useFraudStatus(userId: string | null) {
  const queryClient = useQueryClient();
  const { fingerprint } = useDeviceFingerprint();

  // Log fingerprint when user is authenticated
  useEffect(() => {
    if (!userId || !fingerprint) return;

    const logFingerprint = async () => {
      try {
        // Upsert fingerprint record
        const { error } = await supabase
          .from('device_fingerprints')
          .upsert({
            user_id: userId,
            fingerprint_hash: fingerprint.hash,
            user_agent: fingerprint.userAgent,
            screen_resolution: fingerprint.screenResolution,
            timezone: fingerprint.timezone,
            language: fingerprint.language,
            last_seen_at: new Date().toISOString(),
          }, {
            onConflict: 'fingerprint_hash,user_id',
          });

        if (error) {
          console.error('Failed to log fingerprint:', error);
          return;
        }

        // Check for multi-account abuse
        await supabase.rpc('detect_multi_account_abuse', {
          p_fingerprint_hash: fingerprint.hash,
          p_user_id: userId,
        });
      } catch (error) {
        console.error('Fingerprint logging error:', error);
      }
    };

    logFingerprint();
  }, [userId, fingerprint]);

  // Fetch fraud status
  const { data: fraudStatus, isLoading, refetch } = useQuery({
    queryKey: ['fraud-status', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_fraud_status')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch fraud status:', error);
        return null;
      }

      return data as UserFraudStatus | null;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fraud signals are intentionally NOT fetched for regular users
  // This data is sensitive and could help attackers circumvent security
  // Admins access fraud signals through FraudReviewPanel with their own query

  // Check velocity abuse
  const checkVelocity = useMutation({
    mutationFn: async ({ featureName, windowSeconds = 60, maxRequests = 10 }: {
      featureName: string;
      windowSeconds?: number;
      maxRequests?: number;
    }) => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('detect_velocity_abuse', {
        p_user_id: userId,
        p_feature_name: featureName,
        p_window_seconds: windowSeconds,
        p_max_requests: maxRequests,
      });

      if (error) {
        console.error('Velocity check failed:', error);
        return false;
      }

      if (data === true) {
        // Refresh fraud status after detection
        queryClient.invalidateQueries({ queryKey: ['fraud-status', userId] });
      }

      return data as boolean;
    },
  });

  // Determine if user should have reduced limits
  const getFeatureLimit = (featureName: string, defaultLimit: number): number => {
    if (!fraudStatus) return defaultLimit;

    // Check for specific feature override
    if (fraudStatus.feature_limits?.[featureName]) {
      return fraudStatus.feature_limits[featureName];
    }

    // Apply reduction based on status
    switch (fraudStatus.status) {
      case 'soft_blocked':
        return Math.ceil(defaultLimit * 0.25); // 75% reduction
      case 'warning':
        return Math.ceil(defaultLimit * 0.5); // 50% reduction
      default:
        return defaultLimit;
    }
  };

  return {
    fraudStatus,
    signals: [] as FraudSignal[], // Always empty for security - admins use FraudReviewPanel
    isLoading,
    refetch,
    checkVelocity: checkVelocity.mutateAsync,
    getFeatureLimit,
    isClean: !fraudStatus || fraudStatus.status === 'clean',
    isWarned: fraudStatus?.status === 'warning',
    isSoftBlocked: fraudStatus?.status === 'soft_blocked',
    fingerprint,
  };
}
