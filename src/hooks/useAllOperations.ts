import { useRealtimeReady } from './useUnifiedRealtime';
import { operationPollInterval } from '@/lib/operationPolling';
import { useContext } from "react";
import { SubscriptionUserContext } from "./useSubscription";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OperationProgress {
  id: string;
  user_id: string;
  player_tag: string;
  operation_type: string;
  run_id?: string | null;
  status: "running" | "completed" | "failed" | "cancelled";
  progress: number;
  total: number;
  current_step: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
}

export const operationLabels: Record<string, { labelKey: string; icon: string }> = {
  'card_mastery_calculation': { labelKey: 'progress.cardMastery', icon: 'Sparkles' },
  'card_collection_sync': { labelKey: 'progress.collection', icon: 'RefreshCw' },
  'deck_stats_tracking': { labelKey: 'progress.deckStats', icon: 'BarChart2' },
  'achievement_sync': { labelKey: 'progress.achievements', icon: 'Trophy' },
};

/**
 * Hook for all operations - realtime handled by useUnifiedRealtime
 */
export function useAllOperations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const accountId = useContext(SubscriptionUserContext);
  const realtimeReady = useRealtimeReady(accountId);

  // Use React Query for data fetching - realtime invalidation handled by useUnifiedRealtime
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== accountId) return [];

      const { data, error } = await supabase
        .from("operation_progress")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return Promise.all((data || []).map(async op => {
        if (op.operation_type !== 'card_collection_sync' || op.status !== 'running') return op;
        const lease = op.lease_expires_at ? Date.parse(op.lease_expires_at) : Date.parse(op.updated_at) + 90_000;
        if (lease > Date.now()) return op;
        const result = await supabase.rpc('get_my_card_collection_sync', { p_tag: op.player_tag });
        if (result.error) throw result.error;
        return result.data || op;
      })) as Promise<OperationProgress[]>;
    },
    // Only poll when there are active operations
    refetchInterval: (query) => operationPollInterval(!!query.state.data?.some(op => op.status === 'running'), realtimeReady, 5000),
  });

  const cancelMutation = useMutation({
    mutationFn: async (operationId: string) => {
      const operation = operations.find(op => op.id === operationId);
      if (!operation) throw new Error('Operation unavailable');
      if (operation.operation_type === 'card_collection_sync') {
        const { data, error } = await supabase.rpc('cancel_card_collection_sync', {
          p_operation: operationId, p_run: operation.run_id ?? null,
        });
        if (error) throw error;
        return (data as { status?: string })?.status === 'cancelled';
      }
      const { data, error } = await supabase.from('operation_progress')
        .update({ status: 'cancelled' }).eq('id', operationId).eq('user_id', accountId!)
        .eq('status', 'running').select('id');
      if (error) throw error;
      return !!data?.length;
    },
    onSuccess: (cancelled) => {
      if (cancelled) toast.info(t('operations.cancelled'));
      queryClient.invalidateQueries({ queryKey: ['operation-progress'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
    onError: (error) => {
      console.error("Error cancelling operation:", error);
      toast.error(t('operations.cancelFailed'));
    },
  });

  const activeCount = operations.filter((op) => op.status === "running").length;

  return {
    operations,
    activeCount,
    isLoading,
    cancelOperation: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
}
