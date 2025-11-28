import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export interface PredictionHistoryEntry {
  id: string;
  deckACards: string[];
  deckBCards: string[];
  predictedWinRateA: number;
  predictedWinRateB: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string | null;
  keyMatchups: any[];
  tips: { forDeckA: string[]; forDeckB: string[] } | null;
  actualWinsA: number;
  actualLossesA: number;
  actualBattlesTotal: number;
  actualWinRateA: number | null;
  predictionError: number | null;
  createdAt: string;
  lastBattleAt: string | null;
}

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

      return (data || []).map((entry: any): PredictionHistoryEntry => {
        const actualWinRateA = entry.actual_battles_total > 0
          ? Math.round((entry.actual_wins_deck_a / entry.actual_battles_total) * 100)
          : null;

        return {
          id: entry.id,
          deckACards: entry.deck_a_cards || [],
          deckBCards: entry.deck_b_cards || [],
          predictedWinRateA: entry.predicted_win_rate_a,
          predictedWinRateB: entry.predicted_win_rate_b,
          confidence: entry.confidence,
          explanation: entry.explanation,
          keyMatchups: entry.key_matchups || [],
          tips: entry.tips,
          actualWinsA: entry.actual_wins_deck_a || 0,
          actualLossesA: entry.actual_losses_deck_a || 0,
          actualBattlesTotal: entry.actual_battles_total || 0,
          actualWinRateA,
          predictionError: entry.prediction_error,
          createdAt: entry.created_at,
          lastBattleAt: entry.last_battle_at,
        };
      });
    },
    enabled: !!playerTag,
    staleTime: 5 * 60 * 1000,
  });
}
