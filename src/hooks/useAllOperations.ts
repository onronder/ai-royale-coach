import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OperationProgress {
  id: string;
  user_id: string;
  player_tag: string;
  operation_type: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progress: number;
  total: number;
  current_step: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
}

export const operationLabels: Record<string, { label: string; icon: string }> = {
  'card_mastery_calculation': { label: 'Card Mastery Calculation', icon: 'Sparkles' },
  'card_collection_sync': { label: 'Card Collection Sync', icon: 'RefreshCw' },
  'deck_stats_tracking': { label: 'Deck Stats Tracking', icon: 'BarChart2' },
  'achievement_sync': { label: 'Achievement Sync', icon: 'Trophy' },
};

/**
 * Hook for all operations - realtime handled by useUnifiedRealtime
 */
export function useAllOperations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Use React Query for data fetching - realtime invalidation handled by useUnifiedRealtime
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("operation_progress")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as OperationProgress[];
    },
    refetchInterval: 5000, // Fallback polling for operations
  });

  const cancelMutation = useMutation({
    mutationFn: async (operationId: string) => {
      const { error } = await supabase
        .from("operation_progress")
        .update({ status: "cancelled" })
        .eq("id", operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.info(t('operations.cancelled'));
      queryClient.invalidateQueries({ queryKey: ["operation-progress"] });
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
