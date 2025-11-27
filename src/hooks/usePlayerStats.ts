import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlayerStats {
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  avgCrowns: number;
  avgTrophyChange: number;
  deckStats: Array<{
    deckHash: string;
    cards: string[];
    wins: number;
    losses: number;
    battles: number;
    winRate: number;
  }>;
}

export function usePlayerStats(playerTag: string | null) {
  return useQuery({
    queryKey: ['player-stats', playerTag],
    queryFn: async () => {
      if (!playerTag) throw new Error('Player tag is required');
      
      const { data, error } = await supabase.functions.invoke<PlayerStats>('calculate-player-stats', {
        body: { playerTag }
      });

      if (error) throw error;
      if (!data) throw new Error('No stats data returned');

      return data;
    },
    enabled: !!playerTag,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
