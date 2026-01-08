import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlayerProfile {
  id: string;
  user_id: string;
  player_tag: string;
  note: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  // Extended fields from API (populated separately)
  player_name?: string;
  trophies?: number;
  bestTrophies?: number;
  arena_name?: string;
  clan_name?: string;
  clan_badge_id?: number;
  wins?: number;
  losses?: number;
  battleCount?: number;
  threeCrownWins?: number;
  challengeMaxWins?: number;
  challengeCardsWon?: number;
  donations?: number;
  donationsReceived?: number;
  warDayWins?: number;
  expLevel?: number;
}

export function usePlayerProfiles(userId: string | null) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ['player-profiles', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false });
      
      if (error) throw error;
      
      // Enrich profiles with cached player data
      const enrichedProfiles = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: cache } = await supabase
            .from('player_cache')
            .select('player_data')
            .eq('player_tag', profile.player_tag)
            .maybeSingle();
          
          if (cache?.player_data) {
            const p = cache.player_data as {
              name?: string;
              trophies?: number;
              bestTrophies?: number;
              arena?: { name?: string };
              clan?: { name?: string; badgeId?: number };
              wins?: number;
              losses?: number;
              battleCount?: number;
              threeCrownWins?: number;
              challengeMaxWins?: number;
              challengeCardsWon?: number;
              donations?: number;
              donationsReceived?: number;
              warDayWins?: number;
              expLevel?: number;
            };
            return {
              ...profile,
              player_name: p.name,
              trophies: p.trophies,
              bestTrophies: p.bestTrophies,
              arena_name: p.arena?.name,
              clan_name: p.clan?.name,
              clan_badge_id: p.clan?.badgeId,
              wins: p.wins,
              losses: p.losses,
              battleCount: p.battleCount,
              threeCrownWins: p.threeCrownWins,
              challengeMaxWins: p.challengeMaxWins,
              challengeCardsWon: p.challengeCardsWon,
              donations: p.donations,
              donationsReceived: p.donationsReceived,
              warDayWins: p.warDayWins,
              expLevel: p.expLevel,
            };
          }
          return profile;
        })
      );
      
      return enrichedProfiles as PlayerProfile[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const addProfileMutation = useMutation({
    mutationFn: async ({ playerTag, note }: { playerTag: string; note?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const normalizedTag = playerTag.replace('#', '').toUpperCase();
      
      const { count } = await supabase
        .from('player_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if ((count || 0) >= 3) {
        throw new Error('Maximum of 3 player tags allowed per account');
      }
      
      const { data, error } = await supabase
        .from('player_profiles')
        .insert({
          user_id: userId,
          player_tag: normalizedTag,
          note: note || null,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('This player tag is already added to your account');
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-profiles', userId] });
      toast.success(t('toasts.playerTagAdded'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('player_profiles')
        .delete()
        .eq('id', profileId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-profiles', userId] });
      toast.success(t('toasts.playerTagRemoved'));
    },
    onError: (error: Error) => {
      toast.error(t('toasts.playerTagRemoveFailed'));
    },
  });

  const updateLastSeenMutation = useMutation({
    mutationFn: async (playerTag: string) => {
      if (!userId) return;
      
      const normalizedTag = playerTag.replace('#', '').toUpperCase();
      
      const { data: existing } = await supabase
        .from('player_profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('player_tag', normalizedTag)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('player_profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        const { count } = await supabase
          .from('player_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        if ((count || 0) < 3) {
          await supabase
            .from('player_profiles')
            .insert({
              user_id: userId,
              player_tag: normalizedTag,
              last_seen_at: new Date().toISOString(),
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-profiles', userId] });
    },
  });

  return {
    profiles: profilesQuery.data || [],
    isLoading: profilesQuery.isLoading,
    error: profilesQuery.error,
    addProfile: addProfileMutation.mutateAsync,
    removeProfile: removeProfileMutation.mutateAsync,
    updateLastSeen: updateLastSeenMutation.mutate,
    isAdding: addProfileMutation.isPending,
    isRemoving: removeProfileMutation.isPending,
    canAddMore: (profilesQuery.data?.length || 0) < 3,
  };
}

// Helper to get clan badge URL
export function getClanBadgeUrl(badgeId: number | undefined): string {
  if (!badgeId) return '';
  return `https://royaleapi.github.io/cr-api-assets/badges/${badgeId}.png`;
}
