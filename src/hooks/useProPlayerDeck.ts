import { useQuery } from '@tanstack/react-query';
import { clashRoyaleApi, ClashRoyaleCard } from '@/services/clashRoyaleApi';

interface ProPlayerDeckResult {
  deck: ClashRoyaleCard[];
  trophies: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProPlayerDeck(playerTag: string): ProPlayerDeckResult {
  const normalizedTag = playerTag ? clashRoyaleApi.normalizeTag(playerTag) : '';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['proPlayerDeck', normalizedTag],
    queryFn: () => clashRoyaleApi.getPlayer(normalizedTag),
    enabled: !!normalizedTag,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
  });

  return {
    deck: data?.currentDeck || [],
    trophies: data?.trophies || 9000,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
