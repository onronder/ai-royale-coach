import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeReady(account: string | null) {
  return useQuery({ queryKey: ['realtime-ready', account], queryFn: () => false, enabled: false, initialData: false }).data;
}

export function useUnifiedRealtime(userId: string | null, publicView?: 'leaderboard' | 'tournaments') {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const refreshOperations = () => {
      void queryClient.invalidateQueries({ queryKey: ['operations', userId] });
      void queryClient.invalidateQueries({ queryKey: ['operation-progress', userId] });
    };
    queryClient.setQueryData(['realtime-ready', userId], false);
    const channel = supabase.channel(`user-data:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        if (active) void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${userId}` }, payload => {
        if (!active) return;
        void queryClient.invalidateQueries({ queryKey: ['player-context', userId] });
        const next = payload.new as { unlocked_at?: string | null };
        const previous = payload.old as { unlocked_at?: string | null };
        if (payload.eventType === 'UPDATE' && next?.unlocked_at && !previous?.unlocked_at)
          void queryClient.invalidateQueries({ queryKey: ['new-achievement'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operation_progress', filter: `user_id=eq.${userId}` }, () => {
        if (active) refreshOperations();
      })
      .subscribe(status => {
        if (!active) return;
        queryClient.setQueryData(['realtime-ready', userId], status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          // A reconnect must reconcile events missed while disconnected.
          refreshOperations();
          void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          void queryClient.invalidateQueries({ queryKey: ['player-context', userId] });
        }
      });
    return () => {
      active = false;
      queryClient.setQueryData(['realtime-ready', userId], false);
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  useEffect(() => {
    if (!userId || !publicView) return;
    let active = true;
    const refresh = () => {
      if (!active) return;
      void queryClient.invalidateQueries({ queryKey: [publicView] });
      if (publicView === 'tournaments') void queryClient.invalidateQueries({ queryKey: ['tournament-registrations'] });
    };
    const channel = supabase.channel(`public-data:${publicView}`);
    const tables = publicView === 'leaderboard' ? ['leaderboard_entries'] : ['tournaments', 'tournament_registrations'];
    for (const table of tables) channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    channel.subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [userId, publicView, queryClient]);
}
