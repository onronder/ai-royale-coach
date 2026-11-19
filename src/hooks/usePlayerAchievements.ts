import { useTranslation } from 'react-i18next';
import { useMemo } from "react";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { checkAchievements } from "@/utils/achievementSystem";

/**
 * Hook to compute achievements from battle history
 */
export function usePlayerAchievements(battles: ClashRoyaleBattle[] | null, playerTag: string) {
  const { t } = useTranslation();
  const achievements = useMemo(() => {
    if (!battles || battles.length === 0) {
      return [];
    }
    return checkAchievements(battles, t, playerTag);
  }, [battles, t, playerTag]);

  return {
    achievements,
    totalUnlocked: achievements.length,
    hasAchievements: achievements.length > 0,
  };
}
