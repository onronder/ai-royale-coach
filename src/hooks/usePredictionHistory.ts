import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { KeyMatchup, PredictionHistoryEntry } from "@/types/analysis.types";

export type { PredictionHistoryEntry };

export function usePredictionHistory(playerTag: string | null) {
  const { i18n } = useTranslation();

  return useQuery({
    queryKey: ['prediction-history', playerTag, i18n.language],
    queryFn: async () => {
      if (!playerTag) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('matchup_predictions')
        .select('*')
        .eq('player_tag', playerTag)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching prediction history:', error);
        return [];
      }

      return (data || []).map((entry): PredictionHistoryEntry => {
        const actualWinRateA = (entry.actual_battles_total || 0) > 0
          ? Math.round(((entry.actual_wins_deck_a || 0) / (entry.actual_battles_total || 1)) * 100)
          : null;

        const deckACards = entry.deck_a_cards as string[] | null;
        const deckBCards = entry.deck_b_cards as string[] | null;
        const keyMatchups = (entry.key_matchups as unknown as KeyMatchup[] | null) || [];
        const tips = entry.tips as unknown as { forDeckA: string[]; forDeckB: string[] } | null;

        return {
          id: entry.id,
          deckACards: deckACards || [],
          deckBCards: deckBCards || [],
          predictedWinRateA: entry.predicted_win_rate_a,
          predictedWinRateB: entry.predicted_win_rate_b,
          confidence: entry.confidence as 'high' | 'medium' | 'low',
          explanation: entry.explanation,
          keyMatchups,
          tips,
          actualWinsA: entry.actual_wins_deck_a || 0,
          actualLossesA: entry.actual_losses_deck_a || 0,
          actualBattlesTotal: entry.actual_battles_total || 0,
          actualWinRateA,
          predictionError: entry.prediction_error,
          createdAt: entry.created_at || '',
          lastBattleAt: entry.last_battle_at,
        };
      });
    },
    enabled: !!playerTag,
    staleTime: 5 * 60 * 1000,
  });
}
