import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeckRecommendation {
  deckId: string;
  deckName: string;
  cards: string[];
  archetype: string;
  avgElixir: number;
  difficulty: string;
  matchScore: number;
  reason: string;
  aiExplanation?: string;
  recommendationType: 'standard' | 'counter' | 'strength';
  fromCache?: boolean;
}

export interface PlayerRecommendationProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  bestArchetypes: string[];
  recentWinRate: number;
  totalBattles: number;
}

export interface RecommendationResponse {
  recommendations: DeckRecommendation[];
  profile?: PlayerRecommendationProfile;
  aiEnhanced: boolean;
  fromCache: boolean;
}

export const useRecommendations = (playerTag: string, trophies: number) => {
  const { i18n } = useTranslation();

  return useQuery({
    queryKey: ['deck-recommendations', playerTag, i18n.language],
    queryFn: async (): Promise<RecommendationResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('recommend-deck', {
        body: { 
          playerTag, 
          trophies,
          language: i18n.language 
        }
      });

      if (error) throw error;
      return data as RecommendationResponse;
    },
    enabled: !!playerTag && trophies > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });
};

export const useRefreshRecommendations = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playerTag, trophies }: { playerTag: string; trophies: number }) => {
      toast.loading(t('recommendations.refreshing'), { id: 'refresh-recommendations' });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('recommend-deck', {
        body: { 
          playerTag, 
          trophies,
          forceRefresh: true,
          language: i18n.language 
        }
      });

      if (error) throw error;
      return data as RecommendationResponse;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['deck-recommendations', variables.playerTag, i18n.language], 
        data
      );
      toast.success(t('recommendations.refreshed'), { id: 'refresh-recommendations' });
    },
    onError: (error) => {
      console.error('Recommendation refresh error:', error);
      toast.error(t('recommendations.refreshFailed'), { id: 'refresh-recommendations' });
    },
  });
};

export const useRecommendationHistory = (playerTag: string) => {
  return useQuery({
    queryKey: ['recommendation-history', playerTag],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recommendation_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!playerTag,
  });
};

export const useMarkRecommendationAdopted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recommendationId, playerTag }: { recommendationId: string; playerTag: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('recommendation_history')
        .update({
          adopted: true,
          adopted_at: new Date().toISOString()
        })
        .eq('id', recommendationId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { recommendationId, playerTag };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recommendation-history', variables.playerTag] });
    },
  });
};
