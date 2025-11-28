import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface DashboardUser {
  id: string;
  email?: string;
}

interface PlayerContextData {
  savedDecks: any[];
  cardMastery: any[];
  achievements: any[];
  cardCollection: any[];
}

/**
 * Hook to manage authentication and player context data for dashboard
 */
export function useDashboardData(playerTag: string | undefined) {
  const navigate = useNavigate();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [playerContext, setPlayerContext] = useState<PlayerContextData>({
    savedDecks: [],
    cardMastery: [],
    achievements: [],
    cardCollection: [],
  });

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

  // Fetch player context data for AI coach - batched for performance
  useEffect(() => {
    const fetchPlayerContext = async () => {
      if (!user?.id || !playerTag) return;
      
      // Batch all context queries with Promise.all for better performance
      const [decksResult, masteryResult, achievementsResult, collectionResult] = await Promise.all([
        supabase.from('saved_decks').select('*').eq('user_id', user.id),
        supabase.from('card_mastery').select('*').eq('player_tag', playerTag),
        supabase.from('user_achievements').select('*, achievement:achievements(*)').eq('player_tag', playerTag),
        supabase.from('card_collection').select('*').eq('player_tag', playerTag),
      ]);

      setPlayerContext({
        savedDecks: decksResult.data || [],
        cardMastery: masteryResult.data || [],
        achievements: achievementsResult.data || [],
        cardCollection: collectionResult.data || [],
      });
    };

    fetchPlayerContext();
  }, [user, playerTag]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/");
  }, [navigate]);

  return {
    user,
    playerContext,
    handleSignOut,
  };
}
