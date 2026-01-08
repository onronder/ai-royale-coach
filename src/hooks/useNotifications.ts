import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 'achievement' | 'sync' | 'calculation' | 'info' | 'success' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  player_tag: string;
  type: NotificationType;
  title: string;
  message: string;
  icon_name?: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook for notifications - realtime handled by useUnifiedRealtime
 */
export const useNotifications = (playerTag?: string) => {
  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', playerTag],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (playerTag) {
        query.eq('player_tag', playerTag);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
    enabled: true,
  });

  // NOTE: Realtime subscription moved to useUnifiedRealtime for scalability

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
  };
};

// Mark notification as read
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Mark all notifications as read
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerTag?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id);

      if (playerTag) {
        query.eq('player_tag', playerTag);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Create a notification
export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at' | 'read'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .insert({
          player_tag: notification.player_tag,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          icon_name: notification.icon_name,
          metadata: notification.metadata as Record<string, unknown> | undefined,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Delete a notification
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Clear all notifications
export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playerTag?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const query = supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (playerTag) {
        query.eq('player_tag', playerTag);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
