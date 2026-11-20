import { evidenceKey } from '../../supabase/functions/_shared/deck-evidence';
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ClashRoyalePlayer, ClashRoyaleBattle } from "@/services/clashRoyaleApi";

interface PlayerAnalysisResult {
  analysis: string;
  read_only?: boolean;
  analyzed_at?: string;
  stats: {
    winRate: string;
    avgTrophyChange: string;
    recentWins: number;
    recentLosses: number;
  };
}

export function usePlayerAnalysis(
  player: ClashRoyalePlayer | undefined,
  battles: ClashRoyaleBattle[] | undefined,
  enabled = true
) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'en';
  
  return useQuery({
    queryKey: ['player-analysis', player?.tag, language, evidenceKey(player, battles)],
    queryFn: async () => {
      if (!player || !battles) {
        throw new Error('Player data and battles are required');
      }

      const { data, error } = await supabase.functions.invoke<PlayerAnalysisResult>('analyze-player', {
        body: { playerData: player, battles, language }
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
    // A tab return must not retry a failed/uncertain request for this cached key.
    // Changing player, evidence or language still selects its own query.
    enabled: query => enabled && !!player && !!battles && query.state.status !== 'error',
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: false,
  });
}
