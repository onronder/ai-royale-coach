import { syncCardCollection } from '@/lib/cardCollectionSync';
import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Completed = 'collectionSynced' | 'masteryCalculated' | 'deckStatsTracked';
// Join only the same account/player. A slow player must not skip another player.
const pending = new Map<string, Promise<Completed[]>>();

export function useBackgroundSync(userId: string | null, playerTag: string | undefined) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const tag = playerTag ? canonicalTag(playerTag) : '';
  const key = userId + ':' + tag;
  const current = useRef(key); current.current = key;
  const translate = useRef(t); translate.current = t;
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    if (!userId || !tag || attempted.current.has(key)) return;
    attempted.current.add(key);
    let mounted = true;
    const joined = pending.has(key);
    const notices: Completed[] = [];
    const sessionForAccount = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || session?.user.id !== userId) throw new Error('Account changed');
      return session;
    };
    const run = async () => {
      const completed: Completed[] = [];
      const steps = [
        { table: 'card_collection', fn: '', label: 'collectionSynced' },
        { table: 'card_mastery', fn: 'calculate-card-mastery', label: 'masteryCalculated' },
        { table: 'deck_usage_stats', fn: 'track-deck-stats', label: 'deckStatsTracked' },
      ] as const;
      for (const step of steps) {
        try {
          await sessionForAccount();
          let query = supabase.from(step.table).select('*', { count: 'exact', head: true })
            .eq('user_id', userId).in('player_tag', [tag, tag.slice(1)]);
          if (step.fn) query = query.filter('observation_scope', 'eq', 'recent-battles-v2');
          const { count, error } = await query;
          if (error || count === null) throw error || new Error('Count unavailable');
          if (count !== 0) continue;
          const session = await sessionForAccount();
          if (!step.fn) {
            const result = await syncCardCollection(userId, tag);
            if (result.success && result.status === 'completed') {
              completed.push(step.label);
              if (result.claimed && !result.joined) notices.push(step.label);
            }
          } else {
            const { data, error } = await supabase.functions.invoke(step.fn, {
              headers: { Authorization: 'Bearer ' + session.access_token }, body: { playerTag: tag },
            });
            if (error || data?.success !== true) throw error || new Error('Operation did not complete');
            completed.push(step.label);
            notices.push(step.label);
          }
          if (step.table !== 'deck_usage_stats') await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          // No automatic retry: cancellation, failure and unknown results are not success.
          console.error('Background statistics unavailable:', step.table, error);
        }
      }
      return completed;
    };
    let request = pending.get(key);
    if (!request) {
      request = run().then(async completed => {
        // Refresh the operation's cache even if its initiating view has left.
        // Only this owner does it; joined observers must not duplicate refetches.
        try { await sessionForAccount(); } catch { return completed; }
        if (completed.some(label => label === 'collectionSynced' || label === 'masteryCalculated'))
          void client.invalidateQueries({ queryKey: ['player-context', userId, tag.slice(1)] });
        if (completed.includes('deckStatsTracked'))
          void client.invalidateQueries({ predicate: query => query.queryKey[0] === 'deck-stats' &&
            typeof query.queryKey[1] === 'string' && canonicalTag(query.queryKey[1]) === tag });
        return completed;
      }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
      pending.set(key, request);
    }
    void request.then(async completed => {
      if (!mounted || current.current !== key || joined || !completed.length) return;
      try { await sessionForAccount(); } catch { return; }
      if (!mounted || current.current !== key) return;
      for (const label of notices) toast.success(translate.current('dashboard.sync.' + label));
    });
    return () => { mounted = false; };
  }, [userId, tag, key, client]);
}
