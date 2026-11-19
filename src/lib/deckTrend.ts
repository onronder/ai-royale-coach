import type { DeckUsageStatRow } from '../types/dashboard.types';
export function deckTrend(stats: DeckUsageStatRow[]) {

  const dailyStats = stats?.reduce((acc, stat) => {
    const date = stat.date.slice(0, 10);

    if (!acc[date]) {
      acc[date] = { date, totalWins: 0, totalBattles: 0, trophyChange: 0, trophySamples:0 };
    }

    acc[date].totalWins += stat.battles_won || 0;
    acc[date].totalBattles += stat.battles_played || 0;
    acc[date].trophySamples += stat.trophy_samples || 0;
    acc[date].trophyChange += stat.total_trophy_change || 0;

    return acc;
  }, {} as Record<string, { date: string; totalWins: number; totalBattles: number; trophyChange: number; trophySamples:number }>) || {};

  return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)).map((day) => ({
    date: day.date,
    winRate: day.totalBattles > 0 ? (day.totalWins / day.totalBattles) * 100 : null,
    trophyChange: day.trophySamples ? day.trophyChange : null,
  }));

}
