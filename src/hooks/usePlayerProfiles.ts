import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  arena_name?: string;
  clan_name?: string;
}

export function usePlayerProfiles(userId: string | null) {
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
            const playerData = cache.player_data as any;
            return {
              ...profile,
              player_name: playerData.name,
              trophies: playerData.trophies,
              arena_name: playerData.arena?.name,
              clan_name: playerData.clan?.name,
            };
          }
          return profile;
        })
      );
      
      return enrichedProfiles as PlayerProfile[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  const addProfileMutation = useMutation({
    mutationFn: async ({ playerTag, note }: { playerTag: string; note?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      
      // Normalize the tag
      const normalizedTag = playerTag.replace('#', '').toUpperCase();
      
      // Check current count
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
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('This player tag is already added to your account');
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-profiles', userId] });
      toast.success('Player tag added successfully!');
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
      toast.success('Player tag removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove player tag');
    },
  });

  const updateLastSeenMutation = useMutation({
    mutationFn: async (playerTag: string) => {
      if (!userId) return;
      
      const normalizedTag = playerTag.replace('#', '').toUpperCase();
      
      // First try to update existing
      const { data: existing } = await supabase
        .from('player_profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('player_tag', normalizedTag)
        .maybeSingle();
      
      if (existing) {
        // Update last_seen_at
        await supabase
          .from('player_profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Auto-add if not exists and under limit
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
