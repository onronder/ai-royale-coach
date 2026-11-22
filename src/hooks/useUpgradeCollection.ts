import { useEffect, useMemo, useRef } from 'react';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionOptions } from '@/lib/playerQueries';
import { completedCollection, type CollectionRead } from '@/lib/deckUpgradePlan';
import { supabase } from '@/integrations/supabase/client';

// Use the existing realtime invalidation prefixes. The plan only reads completed
// game observations; it never starts collection sync or polls for progress.
export function useUpgradeCollection(account: string, tag: string) {
  const client = useQueryClient();
  const { data: cards, isError: cardsFailed, isFetching: fetchingCards, isPending: pendingCards,
    refetch: refetchCards } = useQuery(collectionOptions(account, tag));
  const operation = useQuery({
    queryKey: ['operation-progress', account, tag, 'upgrade-plan'],
    queryFn: async () => {
      const { data, error } = await supabase.from('operation_progress')
        .select('user_id,player_tag,status,started_at,last_successful_at,synced_cards')
        .eq('user_id', account).eq('operation_type', 'card_collection_sync').in('player_tag', [tag, tag.slice(1)])
        .order('started_at', { ascending: false }).order('id').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  const key = useMemo(() => ['verified-upgrade-collection', account, tag], [account, tag]);
  const { data: previous } = useQuery<CollectionRead & { end: number }>({ queryKey: key, queryFn: skipToken });
  const sync = operation.data ?? null;
  const verified = useMemo(() => completedCollection({ sync, cards: cards ?? [] }, account, tag),
    [sync, cards, account, tag]);
  const lastRepair = useRef<string | null>(null);
  const failed = cardsFailed || operation.isError;
  useEffect(() => {
    if (!sync || !cards || failed) return;
    if (verified) {
      if (!previous || verified.end > previous.end) {
        client.setQueryData(key, { sync, cards: verified.cards, end: verified.end });
      }
    } else if (sync.status === 'completed' && sync.last_successful_at &&
      (!previous || sync.last_successful_at !== previous.sync?.last_successful_at) && !fetchingCards &&
      lastRepair.current !== sync.last_successful_at) {
      // A completion event can beat the new rows. Re-read once for that observation.
      lastRepair.current = sync.last_successful_at;
      void refetchCards();
    }
  }, [key, client, sync, cards, fetchingCards, refetchCards, previous, verified, failed]);
  return {
    snapshot: { cards: cards ?? [], sync: failed ? null : sync, userId: account, playerTag: tag, previous },
    noSync: operation.isSuccess && !sync,
    knownCards: (verified && (!previous || verified.end >= previous.end) ? verified.cards : previous?.cards) ?? [],
    failed,
    loading: operation.isPending || pendingCards,
    refresh: () => Promise.all([refetchCards(), operation.refetch()]),
  };
}
