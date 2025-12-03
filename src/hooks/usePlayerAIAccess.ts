import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AIAccessStatus {
  hasAIAccess: boolean;
  profileId: string | null;
}

export function usePlayerAIAccess(playerTag: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['player-ai-access', playerTag],
    queryFn: async (): Promise<AIAccessStatus> => {
      if (!playerTag) {
        return { hasAIAccess: false, profileId: null };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { hasAIAccess: false, profileId: null };
      }

      const { data: profile, error } = await supabase
        .from('player_profiles')
        .select('id, ai_enabled')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .single();

      if (error || !profile) {
        return { hasAIAccess: false, profileId: null };
      }

      return { 
        hasAIAccess: profile.ai_enabled || false,
        profileId: profile.id
      };
    },
    enabled: !!playerTag,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    hasAIAccess: data?.hasAIAccess ?? false,
    profileId: data?.profileId ?? null,
    isLoading,
    error,
  };
}

interface ProfileWithAIStatus {
  id: string;
  player_tag: string;
  ai_enabled: boolean;
  last_seen_at: string | null;
  player_name?: string;
  trophies?: number;
  clan_name?: string;
}

export function useUserAIProfiles() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading, error, refetch } = useQuery({
    queryKey: ['user-ai-profiles'],
    queryFn: async (): Promise<ProfileWithAIStatus[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get profiles with their ai_enabled status
      const { data: playerProfiles, error: profilesError } = await supabase
        .from('player_profiles')
        .select('id, player_tag, ai_enabled, last_seen_at')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false });

      if (profilesError || !playerProfiles) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // Enrich with cached player data
      const enrichedProfiles: ProfileWithAIStatus[] = [];
      
      for (const profile of playerProfiles) {
        const { data: cache } = await supabase
          .from('player_cache')
          .select('player_data')
          .eq('player_tag', profile.player_tag)
          .single();

        const playerData = cache?.player_data as any;
        
        enrichedProfiles.push({
          ...profile,
          ai_enabled: profile.ai_enabled || false,
          player_name: playerData?.name,
          trophies: playerData?.trophies,
          clan_name: playerData?.clan?.name,
        });
      }

      return enrichedProfiles;
    },
    staleTime: 1000 * 60 * 2,
  });

  const updateAIMutation = useMutation({
    mutationFn: async (enabledProfileIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('manage-ai-accounts', {
        body: { enabledProfileIds },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-ai-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['player-ai-access'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  return {
    profiles: profiles || [],
    isLoading,
    error,
    refetch,
    updateAIAccess: updateAIMutation.mutateAsync,
    isUpdating: updateAIMutation.isPending,
  };
}

interface AISelectionStatus {
  needsSelection: boolean;
  accountSlots: number;
}

export function useNeedsAISelection() {
  const { data, isLoading } = useQuery({
    queryKey: ['needs-ai-selection'],
    queryFn: async (): Promise<AISelectionStatus> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { needsSelection: false, accountSlots: 0 };

      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('needs_ai_selection, account_slots')
        .eq('user_id', user.id)
        .single();

      return {
        needsSelection: sub?.needs_ai_selection || false,
        accountSlots: sub?.account_slots || 0,
      };
    },
    staleTime: 1000 * 30,
  });

  return {
    needsSelection: data?.needsSelection ?? false,
    accountSlots: data?.accountSlots ?? 0,
    isLoading,
  };
}
