import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCreateNotification } from './useNotifications';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'master';
  icon_name: string;
  criteria: any;
  points: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  progress: number;
  unlocked_at: string | null;
  achievements: Achievement;
}

interface AchievementProgress {
  skill_levels: {
    cardPlacement: number;
    timing: number;
    elixirManagement: number;
    prediction: number;
    adaptation: number;
  };
  learning_phase: string;
  total_mastery_points: number;
  achievements_unlocked: number;
}

export function useAchievements(playerTag: string) {
  return useQuery({
    queryKey: ['achievements', playerTag],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .order('unlocked_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!playerTag,
  });
}

export function useAchievementProgress(playerTag: string) {
  return useQuery({
    queryKey: ['achievement-progress', playerTag],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('achievement_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        skill_levels: data.skill_levels as unknown as {
          cardPlacement: number;
          timing: number;
          elixirManagement: number;
          prediction: number;
          adaptation: number;
        }
      } as AchievementProgress;
    },
    enabled: !!playerTag,
  });
}

export function useAllAchievements() {
  return useQuery({
    queryKey: ['all-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('tier', { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
  });
}

export function useSyncAchievements(playerTag: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutate: createNotification } = useCreateNotification();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-achievements', {
        body: { playerTag },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['achievements', playerTag] });
      queryClient.invalidateQueries({ queryKey: ['achievement-progress', playerTag] });

      if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
        toast.success(
          `🏆 ${data.newlyUnlocked.length > 1 ? t('toasts.achievementsUnlocked') : t('toasts.achievementUnlocked')}`,
          {
            description: data.newlyUnlocked.join(', '),
          }
        );
        
        // Save each achievement to notification history
        data.newlyUnlocked.forEach((achievementName: string) => {
          createNotification({
            player_tag: playerTag,
            type: 'achievement',
            title: `${t('toasts.achievementUnlocked')} ${achievementName}`,
            message: t('achievements.unlockedNew'),
            icon_name: 'trophy'
          });
        });
      } else {
        toast.success(t('toasts.achievementsSynced'));
        
        // Save sync notification
        createNotification({
          player_tag: playerTag,
          type: 'sync',
          title: t('achievements.synced'),
          message: t('achievements.syncedMessage'),
          icon_name: 'refresh-cw'
        });
      }
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast.error(t('toasts.achievementsSyncFailed'));
    },
  });
}
