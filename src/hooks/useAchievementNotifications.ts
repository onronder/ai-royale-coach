import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NewAchievement {
  name: string;
  description: string;
  tier: string;
  icon_name: string;
  points: number;
}

/**
 * Hook for achievement notifications - realtime handled by useUnifiedRealtime
 */
export function useAchievementNotifications(playerTag: string) {
  const [newAchievement, setNewAchievement] = useState<NewAchievement | null>(null);
  const queryClient = useQueryClient();

  // Watch for new achievement query key invalidation from unified realtime
  const { data: latestUnlockedAchievement } = useQuery({
    queryKey: ['new-achievement', playerTag],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get most recently unlocked achievement
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .not('unlocked_at', 'is', null)
        .order('unlocked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // Check if this achievement was unlocked recently (within last 10 seconds)
      const unlockedAt = new Date(data.unlocked_at!);
      const now = new Date();
      const isRecent = (now.getTime() - unlockedAt.getTime()) < 10000;

      if (isRecent && data.achievements) {
        return {
          name: data.achievements.name,
          description: data.achievements.description,
          tier: data.achievements.tier,
          icon_name: data.achievements.icon_name,
          points: data.achievements.points,
        };
      }

      return null;
    },
    enabled: !!playerTag,
    staleTime: 5000,
  });

  // Show notification when new achievement is detected
  useEffect(() => {
    if (latestUnlockedAchievement && !newAchievement) {
      setNewAchievement(latestUnlockedAchievement);

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setNewAchievement(null);
      }, 8000);
    }
  }, [latestUnlockedAchievement]);

  return {
    newAchievement,
    dismissNotification: () => setNewAchievement(null),
  };
}
