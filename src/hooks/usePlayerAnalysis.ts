import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClashRoyalePlayer, ClashRoyaleBattle } from "@/services/clashRoyaleApi";

interface PlayerAnalysisResult {
  analysis: string;
  stats: {
    winRate: string;
    avgTrophyChange: string;
    recentWins: number;
    recentLosses: number;
  };
}

export function usePlayerAnalysis(
  player: ClashRoyalePlayer | undefined,
  battles: ClashRoyaleBattle[] | undefined
) {
  return useQuery({
    queryKey: ['player-analysis', player?.tag],
    queryFn: async () => {
      if (!player || !battles) {
        throw new Error('Player data and battles are required');
      }

      const { data, error } = await supabase.functions.invoke<PlayerAnalysisResult>('analyze-player', {
        body: { playerData: player, battles }
      });

      if (error) throw error;
      if (!data) throw new Error('No analysis data returned');

      return data;
    },
    enabled: !!player && !!battles && battles.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
