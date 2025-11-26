import { useQuery } from "@tanstack/react-query";
import { clashRoyaleApi, ClashRoyalePlayer } from "@/services/clashRoyaleApi";

export function useClashRoyalePlayer(playerTag: string | null) {
  return useQuery({
    queryKey: ['clash-player', playerTag],
    queryFn: () => {
      if (!playerTag) throw new Error('Player tag is required');
      return clashRoyaleApi.getPlayer(playerTag);
    },
    enabled: !!playerTag,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
