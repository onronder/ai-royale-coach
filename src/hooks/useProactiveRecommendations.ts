import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRecommendations } from "./useRecommendations";

interface ProactiveSuggestion {
  type: 'struggling' | 'new_deck' | 'improvement';
  message: string;
  deckName?: string;
  reason?: string;
}

interface UseProactiveRecommendationsProps {
  playerTag: string;
  trophies: number;
  recentWinRate: number;
  totalBattles: number;
}

export function useProactiveRecommendations({
  playerTag,
  trophies,
  recentWinRate,
  totalBattles
}: UseProactiveRecommendationsProps): ProactiveSuggestion | null {
  const { t } = useTranslation();
  const { data: recommendations } = useRecommendations(playerTag, trophies);

  return useMemo(() => {
    // No suggestions if not enough data
    if (totalBattles < 10) return null;
    
    // No recommendations available
    if (!recommendations?.recommendations || recommendations.recommendations.length === 0) {
      return null;
    }

    const topRec = recommendations.recommendations[0];

    // Struggling player detection (win rate < 45%)
    if (recentWinRate < 45 && recentWinRate > 0) {
      return {
        type: 'struggling',
        message: t('recommendations.proactive.struggling', { 
          deckName: topRec.deckName,
          winRate: recentWinRate.toFixed(0)
        }),
        deckName: topRec.deckName,
        reason: topRec.reason
      };
    }

    // Suggest improvement for average players (45-55%)
    if (recentWinRate >= 45 && recentWinRate < 55) {
      return {
        type: 'improvement',
        message: t('recommendations.proactive.improvement', {
          deckName: topRec.deckName
        }),
        deckName: topRec.deckName,
        reason: topRec.reason
      };
    }

    return null;
  }, [recommendations, recentWinRate, totalBattles, t]);
}
