import { useRealtimeReady } from './useUnifiedRealtime';
import { operationPollInterval } from '@/lib/operationPolling';
import { useContext } from "react";
import { SubscriptionUserContext } from "./useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OperationProgress {
  id: string;
  user_id: string;
  player_tag: string;
  operation_type: string;
  status: "running" | "completed" | "failed" | "cancelled";
  run_id?: string | null;
  last_successful_at?: string | null;
  progress: number;
  total: number;
  current_step: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
}

interface UseOperationProgressOptions {
  playerTag: string;
  operationType: string;
  enabled?: boolean;
}

/**
 * Hook for operation progress - realtime handled by useUnifiedRealtime
 */
export function useOperationProgress({
  playerTag,
  operationType,
  enabled = true,
}: UseOperationProgressOptions) {
  const accountId = useContext(SubscriptionUserContext);
  const realtimeReady = useRealtimeReady(accountId);
  const { data: progress, isLoading } = useQuery({
    queryKey: ['operation-progress', accountId, playerTag, operationType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== accountId) return null;
      if (operationType === 'card_collection_sync') {
        const { data, error } = await supabase.rpc('get_my_card_collection_sync', { p_tag: playerTag });
        if (error) throw error;
        return data as unknown as OperationProgress | null;
      }

      const { data, error } = await supabase
        .from("operation_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("player_tag", playerTag)
        .eq("operation_type", operationType)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as OperationProgress | null;
    },
    enabled: enabled && !!accountId,
    refetchInterval: (query) => operationPollInterval(query.state.data?.status === 'running', realtimeReady, 2000),
    staleTime: 1000,
  });

  return {
    progress,
    isLoading,
    isRunning: progress?.status === "running",
    isCompleted: progress?.status === "completed",
    isFailed: progress?.status === "failed",
    isCancelled: progress?.status === "cancelled",
  };
}
