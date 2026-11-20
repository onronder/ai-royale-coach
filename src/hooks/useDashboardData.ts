import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  SavedDeckRow, 
  CardMasteryRow, 
  UserAchievementWithDetails, 
  CardCollectionRow,
  PlayerContextData 
} from "@/types/dashboard.types";

interface DashboardUser {
  id: string;
  email?: string;
}

const emptyContext: PlayerContextData = {
  savedDecks: [],
  cardMastery: [],
  achievements: [],
  cardCollection: [],
};

/**
 * Hook to manage authentication and player context data for dashboard
 */
export function useDashboardData(playerTag: string | undefined) {
  const navigate = useNavigate();
  const [user, setUser] = useState<DashboardUser | null>(null);

  // Authentication effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch player context data with React Query for caching
  const contextQuery = useQuery({
    queryKey: ['player-context', user?.id, playerTag ? canonicalTag(playerTag).slice(1) : ''],
    queryFn: async (): Promise<PlayerContextData> => {
      if (!user?.id || !playerTag) return emptyContext;
      
      // Batch all context queries with Promise.all for better performance
      const [decksResult, masteryResult, achievementsResult, collectionResult] = await Promise.all([
        supabase.from('saved_decks').select('*').eq('user_id', user.id),
        supabase.from('card_mastery').select('*').eq('observation_scope', 'recent-battles-v2').eq('user_id', user.id).eq('player_tag', canonicalTag(playerTag)),
        supabase.from('user_achievements').select('*, achievement:achievements(*)').eq('user_id', user.id).in('player_tag', [canonicalTag(playerTag), canonicalTag(playerTag).slice(1)]),
        supabase.from('card_collection').select('*').eq('user_id', user.id).in('player_tag', [canonicalTag(playerTag), canonicalTag(playerTag).slice(1)]),
      ]);

      for (const result of [decksResult, masteryResult, achievementsResult, collectionResult]) {
        if (result.error) throw result.error;
      }
      return {
        savedDecks: (decksResult.data || []) as SavedDeckRow[],
        cardMastery: (masteryResult.data || []) as CardMasteryRow[],
        achievements: (achievementsResult.data || []) as UserAchievementWithDetails[],
        cardCollection: (collectionResult.data || []) as CardCollectionRow[],
      };
    },
    enabled: !!user?.id && !!playerTag,
    staleTime: 5 * 60 * 1000, // 5 minutes - context data doesn't change often
    refetchOnWindowFocus: false,
  });

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/");
  }, [navigate]);

  // Memoize the return value to prevent unnecessary re-renders
  const stablePlayerContext = useMemo(() => contextQuery.data || emptyContext, [contextQuery.data]);

  return {
    user,
    playerContext: stablePlayerContext,
    contextReady: contextQuery.isSuccess && !contextQuery.isError,
    contextError: contextQuery.isError,
    retryContext: contextQuery.refetch,
    handleSignOut,
  };
}
