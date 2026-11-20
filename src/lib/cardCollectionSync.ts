import { supabase } from '@/integrations/supabase/client';
import type { SyncResult } from '../../supabase/functions/sync-card-collection/handler';
export type CardSyncResponse = SyncResult & { joined?: boolean };
export async function readCardSyncResponse(data: unknown, error: { context?: Response } | null): Promise<CardSyncResponse> {
  let value = data as CardSyncResponse | null;
  if (error?.context instanceof Response) {
    try { value = await error.context.clone().json(); } catch { /* no structured response */ }
  }
  if (!value?.run_id || !['running', 'completed', 'cancelled', 'failed'].includes(value.status) ||
      value.success !== (value.status === 'completed')) throw new Error('Sync outcome unavailable');
  if (error && value.status === 'completed') throw new Error('Conflicting sync response');
  return value;
}
const pending = new Map<string, Promise<CardSyncResponse>>();
export function syncCardCollection(userId: string, playerTag: string, force = false): Promise<CardSyncResponse> {
  const tag = playerTag.trim().replace(/^#/, '').toUpperCase(), key = userId + ':' + tag;
  const current = pending.get(key);
  if (current) return current.then(result => ({ ...result, joined: true, claimed: false }));
  const request = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== userId) throw new Error('Account changed');
    const { data, error } = await supabase.functions.invoke('sync-card-collection', {
      headers: { Authorization: 'Bearer ' + session.access_token }, body: { playerTag: tag, force },
    });
    try { return await readCardSyncResponse(data, error); }
    catch {
      // A lost Edge response must not start another run. Read the durable result
      // first; freshness is decided by the server, not the browser clock.
      const state = await supabase.rpc('get_my_card_collection_sync', { p_tag: tag });
      const op = state.data as { id?: string; user_id?: string; run_id?: string; status?: string; fresh?: boolean; synced_cards?: number; error?: string } | null;
      if (state.error || !op?.run_id || op.user_id !== userId || (op.status === 'completed' && !op.fresh))
        throw new Error('Sync outcome unavailable');
      return readCardSyncResponse({ operation_id: op.id, run_id: op.run_id, status: op.status,
        success: op.status === 'completed', reused: op.status === 'completed', claimed: false,
        joined: op.status === 'running', synced_cards: op.synced_cards ?? null, error_code: op.error ?? null }, null);
    }
  })().finally(() => { if (pending.get(key) === request) pending.delete(key); });
  pending.set(key, request);
  return request;
}
