import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { collectionOptions, savedDeckOptions, masteryOptions, achievementOptions } from '@/lib/playerQueries';
interface DashboardUser {
  id: string;
  email?: string;
}

/**
 * Hook to manage authentication and player context data for dashboard
 */
export function useDashboardData(playerTag: string | undefined, enabled = true) {
  const navigate = useNavigate();
  const [user, setUser] = useState<DashboardUser | null>(null);

  // Authentication effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setUser(null);
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null);
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const account = user?.id || null, tag = playerTag || null;
  const queries = useQueries({ queries: [
    savedDeckOptions(account, tag, enabled), masteryOptions(account, tag, enabled),
    achievementOptions(account, tag, enabled), collectionOptions(account, tag, enabled),
  ] });
  const [decks, mastery, achievements, collection] = queries;
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/");
  }, [navigate]);

  return {
    user,
    playerContext: { savedDecks: decks.data || [], cardMastery: mastery.data || [], achievements: achievements.data || [], cardCollection: collection.data || [] },
    contextReady: queries.every(q => q.isSuccess && !q.isFetching && !q.isError),
    contextError: queries.some(q => q.isError),
    retryContext: () => Promise.all(queries.map(q => q.refetch())),
    handleSignOut,
  };
}
