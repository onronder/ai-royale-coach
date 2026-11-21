import { cardDisplayLevel } from '../_shared/card-display-level.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

export interface SyncResult {
  operation_id: string;
  run_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  success: boolean;
  reused: boolean;
  claimed?: boolean;
  synced_cards: number | null;
  error_code: string | null;
}
export interface SyncDependencies {
  authenticate: (request: Request) => Promise<string | null>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<SyncResult>;
  player: (tag: string) => Promise<unknown>;
}
export function validCollection(value: unknown, tag: string): boolean {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, any>;
  const integer = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;
  return typeof p.tag === 'string' && p.tag.replace(/^#/, '').toUpperCase() === tag &&
    typeof p.name === 'string' && p.name.length > 0 && integer(p.trophies) &&
    Array.isArray(p.cards) && p.cards.length > 0 && p.cards.length <= 500 &&
    new Set(p.cards.map((c: any) => c?.id)).size === p.cards.length &&
    p.cards.every((c: any) => c && integer(c.id) && c.id > 0 && typeof c.name === 'string' &&
      c.name.length > 0 && cardDisplayLevel(c) !== null && typeof c.rarity === 'string' &&
      (c.count == null || integer(c.count)) && (c.elixirCost == null || integer(c.elixirCost)) &&
      (c.evolutionLevel == null || integer(c.evolutionLevel)));
}
// Non-completed responses must also be safe for older HTTP-status-only callers.
const respond = (result: SyncResult) => jsonResponse(result,
  result.status === 'completed' ? 200 : result.status === 'running' || result.status === 'cancelled' ? 409 : 503);

export async function handleCardSync(request: Request, deps: SyncDependencies): Promise<Response> {
  const cors = handleCors(request);
  if (cors) return cors;
  if (request.method !== 'POST') return jsonResponse({ success: false, error_code: 'method_not_allowed' }, 405);
  let user: string | null;
  try { user = await deps.authenticate(request); } catch { user = null; }
  if (!user) return jsonResponse({ success: false, error_code: 'unauthorized' }, 401);
  let body: { playerTag?: unknown; force?: unknown };
  try { body = await request.json(); } catch { return jsonResponse({ success: false, error_code: 'invalid_request' }, 400); }
  const tag = typeof body?.playerTag === 'string' ? body.playerTag.trim().replace(/^#/, '').toUpperCase() : '';
  if (!/^[0289PYLQGRJCUV]{3,15}$/.test(tag)) return jsonResponse({ success: false, error_code: 'invalid_tag' }, 400);
  let claim: SyncResult;
  try {
    claim = await deps.rpc('claim_card_collection_sync', { p_user: user, p_tag: tag, p_force: body.force === true });
  } catch { return jsonResponse({ success: false, error_code: 'sync_unavailable' }, 503); }
  if (!claim.claimed) return respond(claim);
  let failure = 'game_unavailable';
  try {
    const player = await deps.player(tag);
    failure = 'invalid_player';
    if (!validCollection(player, tag)) throw new Error('Invalid player');
    failure = 'sync_failed';
    return respond({ ...await deps.rpc('finish_card_collection_sync', {
      p_user: user, p_run: claim.run_id, p_player: player,
    }), claimed: true });
  } catch {
    try {
      // The same row lock reconciles a lost commit response. Completed/cancelled
      // runs stay terminal; this never fetches the player again or claims a run.
      return respond({ ...await deps.rpc('fail_card_collection_sync', {
        p_user: user, p_run: claim.run_id, p_code: failure,
      }), claimed: true });
    } catch {
      return jsonResponse({ ...claim, claimed: true, success: false, error_code: 'outcome_unknown' }, 503);
    }
  }
}
