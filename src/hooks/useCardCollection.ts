import { useQuery } from '@tanstack/react-query';
import { collectionOptions } from '@/lib/playerQueries';
export function useCardCollection(playerTag: string | null, userId: string | null, enabled = true) {
  return useQuery(collectionOptions(userId, playerTag, enabled));
}
