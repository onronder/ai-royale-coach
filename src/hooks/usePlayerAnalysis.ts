import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  const { i18n } = useTranslation();
  
  return useQuery({
    queryKey: ['player-analysis', player?.tag, i18n.language],
    queryFn: async () => {
      if (!player || !battles) {
        throw new Error('Player data and battles are required');
      }

      const { data, error } = await supabase.functions.invoke<PlayerAnalysisResult>('analyze-player', {
        body: { playerData: player, battles, language: i18n.language }
      });

      if (error) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          throw new Error('AUTH_REQUIRED');
        }
        if (error.message?.includes('403') || error.message?.includes('subscription_required')) {
          throw new Error('SUBSCRIPTION_REQUIRED');
        }
        throw error;
      }

      // Check for subscription_required in response data
      if (data && typeof data === 'object' && 'subscription_required' in data) {
        throw new Error('SUBSCRIPTION_REQUIRED');
      }
      if (!data) throw new Error('No analysis data returned');

      return data;
    },
    enabled: !!player && !!battles && battles.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: (failureCount, err) => {
      if (err instanceof Error && (err.message === 'AUTH_REQUIRED' || err.message === 'SUBSCRIPTION_REQUIRED')) return false;
      return failureCount < 1;
    },
  });
}
