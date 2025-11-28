import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useAllOperations() {
  const { t } = useTranslation();
  const [operations, setOperations] = useState<OperationProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch all current operations (running and recent completed/failed)
      const { data, error } = await supabase
        .from("operation_progress")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setOperations(data as OperationProgress[]);
      }
      setIsLoading(false);

      // Subscribe to real-time updates
      channel = supabase
        .channel(`all_operations:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "operation_progress",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newData = payload.new as OperationProgress;
            
            setOperations((prev) => {
              // Remove old entry if exists
              const filtered = prev.filter((op) => op.id !== newData.id);
              
              // Add new entry at the beginning
              return [newData, ...filtered].slice(0, 20);
            });

            // Auto-remove completed/failed/cancelled after 30 seconds
            if (["completed", "failed", "cancelled"].includes(newData.status)) {
              setTimeout(() => {
                setOperations((prev) => prev.filter((op) => op.id !== newData.id));
              }, 30000);
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

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
