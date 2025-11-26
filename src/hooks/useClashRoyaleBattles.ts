import { useQuery } from "@tanstack/react-query";
import { clashRoyaleApi, ClashRoyaleBattle } from "@/services/clashRoyaleApi";

export function useClashRoyaleBattles(playerTag: string | null) {
  return useQuery({
    queryKey: ['clash-battles', playerTag],
    queryFn: () => {
      if (!playerTag) throw new Error('Player tag is required');
      return clashRoyaleApi.getBattleLog(playerTag);
    },
    enabled: !!playerTag,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}
