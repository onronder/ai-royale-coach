import { observeBattles } from "../../supabase/functions/_shared/battle-observation";
import { useMemo } from "react";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";

interface WinRateResult {
  winRate: number;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  formattedWinRate: string;
}

/**
 * Memoized hook to calculate win rate from battles
 * Prevents recalculation on every render
 */
export function useWinRate(
  battles: ClashRoyaleBattle[] | undefined,
  playerTag: string | undefined
): WinRateResult {
  return useMemo(() => {
    if (!battles || !playerTag || battles.length === 0) {
      return {
        winRate: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        total: 0,
        formattedWinRate: "N/A",
      };
    }

    const summary = observeBattles(battles, playerTag);
    const { wins, losses, draws, total } = summary;
    const winRate = summary.winRate ?? 0;

    return {
      winRate,
      wins,
      losses,
      draws,
      total,
      formattedWinRate: total > 0 ? `${winRate.toFixed(1)}%` : "N/A",
    };
  }, [battles, playerTag]);
}
