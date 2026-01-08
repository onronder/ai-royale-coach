import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface AchievementPayload {
  unlocked_at: string | null;
}

/**
 * Consolidated realtime subscription hook
 * Reduces 6 separate channels to 2 unified channels for better scalability
 */
export function useUnifiedRealtime(userId: string | null, playerTag?: string) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Cleanup existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Channel 1: User-specific data (notifications, achievements, operation progress)
    const userChannel = supabase
      .channel(`user-data:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['achievements'] });
          // Check for new unlocks
          const newData = payload.new as AchievementPayload | undefined;
          const oldData = payload.old as AchievementPayload | undefined;
          if (payload.eventType === 'UPDATE' && newData?.unlocked_at && !oldData?.unlocked_at) {
            queryClient.invalidateQueries({ queryKey: ['new-achievement'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operation_progress',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['operations'] });
          queryClient.invalidateQueries({ queryKey: ['operation-progress'] });
        }
      )
      .subscribe();

    channelsRef.current.push(userChannel);

    // Channel 2: Public/shared data (leaderboard, tournaments)
    const publicChannel = supabase
      .channel('public-data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_entries',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });
          queryClient.invalidateQueries({ queryKey: ['tournament-registrations'] });
        }
      )
      .subscribe();

    channelsRef.current.push(publicChannel);

    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [userId, playerTag, queryClient]);
}
