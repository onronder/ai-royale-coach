import { useMemo } from "react";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { checkAchievements, Achievement } from "@/utils/achievementSystem";

/**
 * Hook to compute achievements from battle history
 */
export function usePlayerAchievements(battles: ClashRoyaleBattle[] | null) {
  const achievements = useMemo(() => {
    if (!battles || battles.length === 0) {
      return [];
    }
    return checkAchievements(battles);
  }, [battles]);

  return {
    achievements,
    totalUnlocked: achievements.length,
    hasAchievements: achievements.length > 0,
  };
}
