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

    // Normalize player tag for comparison
    const normalizedPlayerTag = playerTag.startsWith("#")
      ? playerTag
      : `#${playerTag}`;

    let wins = 0;
    let losses = 0;
    let draws = 0;

    battles.forEach((battle) => {
      const playerTeam = battle.team.find(
        (p) => p.tag === normalizedPlayerTag
      );
      const opponentCrowns = battle.opponent[0]?.crowns || 0;

      if (playerTeam) {
        if (playerTeam.crowns > opponentCrowns) {
          wins++;
        } else if (playerTeam.crowns < opponentCrowns) {
          losses++;
        } else {
          draws++;
        }
      }
    });

    const total = battles.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

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
