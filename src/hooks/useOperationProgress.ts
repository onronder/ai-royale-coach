import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface OperationProgress {
  id: string;
  user_id: string;
  player_tag: string;
  operation_type: string;
  status: "running" | "completed" | "failed";
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

export function useOperationProgress({
  playerTag,
  operationType,
  enabled = true,
}: UseOperationProgressOptions) {
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch current progress
      const { data, error } = await supabase
        .from("operation_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("player_tag", playerTag)
        .eq("operation_type", operationType)
        .eq("status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setProgress(data as OperationProgress);
      }
      setIsLoading(false);

      // Subscribe to real-time updates
      channel = supabase
        .channel(`operation_progress:${user.id}:${playerTag}:${operationType}`)
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
            
            // Only update if it matches our criteria
            if (
              newData.player_tag === playerTag &&
              newData.operation_type === operationType
            ) {
              setProgress(newData);

              // Clear progress after completion/failure
              if (newData.status === "completed" || newData.status === "failed") {
                setTimeout(() => {
                  setProgress(null);
                }, 3000);
              }
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
  }, [playerTag, operationType, enabled]);

  return {
    progress,
    isLoading,
    isRunning: progress?.status === "running",
    isCompleted: progress?.status === "completed",
    isFailed: progress?.status === "failed",
  };
}
