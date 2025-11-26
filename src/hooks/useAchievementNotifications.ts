import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NewAchievement {
  name: string;
  description: string;
  tier: string;
  icon_name: string;
  points: number;
}

export function useAchievementNotifications(playerTag: string) {
  const [newAchievement, setNewAchievement] = useState<NewAchievement | null>(null);

  useEffect(() => {
    if (!playerTag) return;

    const checkForNewAchievements = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Subscribe to new achievements
        const channel = supabase
          .channel(`achievements:${user.id}:${playerTag}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_achievements',
              filter: `user_id=eq.${user.id}`,
            },
            async (payload) => {
              const newRecord = payload.new as any;
              
              // Only show notification if achievement was just unlocked
              if (newRecord.unlocked_at && newRecord.player_tag === playerTag) {
                // Fetch the achievement details
                const { data: achievement } = await supabase
                  .from('achievements')
                  .select('*')
                  .eq('id', newRecord.achievement_id)
                  .single();

                if (achievement) {
                  setNewAchievement({
                    name: achievement.name,
                    description: achievement.description,
                    tier: achievement.tier,
                    icon_name: achievement.icon_name,
                    points: achievement.points,
                  });

                  // Auto-dismiss after 8 seconds
                  setTimeout(() => {
                    setNewAchievement(null);
                  }, 8000);
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up achievement notifications:', error);
      }
    };

    checkForNewAchievements();
  }, [playerTag]);

  return {
    newAchievement,
    dismissNotification: () => setNewAchievement(null),
  };
}
