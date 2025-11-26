import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardOptions {
  type: 'global' | 'clan';
  clanTag?: string | null;
  limit?: number;
}

export function useLeaderboard({ type, clanTag, limit = 100 }: LeaderboardOptions) {
  return useQuery({
    queryKey: ['leaderboard', type, clanTag, limit],
    queryFn: async () => {
      let query = supabase
        .from('leaderboard_entries')
        .select('*')
        .order('trophies', { ascending: false })
        .limit(limit);

      if (type === 'clan' && clanTag) {
        query = query.eq('clan_tag', clanTag);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: type === 'global' || (type === 'clan' && !!clanTag),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}
