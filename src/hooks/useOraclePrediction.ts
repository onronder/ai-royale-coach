import { useQuery } from '@tanstack/react-query';
import { clashRoyaleApi } from '@/services/clashRoyaleApi';
import { analyzeBattleHistory, type OraclePrediction } from '@/lib/observedDeckHistory';
export { analyzeBattleHistory, type OraclePrediction } from '@/lib/observedDeckHistory';

async function fetchAndAnalyze(opponentTag: string): Promise<OraclePrediction | null> {
  const battles = await clashRoyaleApi.getBattleLog(opponentTag);
  
  if (!battles || battles.length === 0) {
    return null;
  }
  
  return analyzeBattleHistory(battles, opponentTag);
}

export function useOraclePrediction(opponentTag: string | null) {
  return useQuery({
    queryKey: ['oracle-prediction', opponentTag],
    queryFn: () => fetchAndAnalyze(opponentTag!),
    enabled: !!opponentTag && opponentTag.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
