import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import type { AiAccessResult } from './ai-access.ts';
import { errorResponse } from './cors.ts';

export function aiPlayerTag(tag: unknown): string | null {
  if (typeof tag !== 'string') return null;
  const normalized = tag.replace(/^#/, '').toUpperCase();
  return /^[0289PYLQGRJCUV]{3,15}$/.test(normalized) ? normalized : null;
}

// Call after the subscription check and before reading a personal cache or generating.
export async function requirePaidPlayerSlot(
  db: Pick<SupabaseClient, 'from'>, userId: string, access: AiAccessResult, playerTag: unknown,
  options: { allowSoleLink?: boolean } = {},
): Promise<Response | null> {
  if (!access.allowed) return errorResponse('Subscription required', 403, { subscription_required: true });
  if (access.isTrial || access.isAdmin) return null;
  // Older deck tools sent only cards. Their player is unambiguous only with one
  // linked profile. Never infer a player from the number of enabled slots alone.
  if (playerTag == null && options.allowSoleLink) {
    const { data, error } = await db.from('player_profiles').select('ai_enabled')
      .eq('user_id', userId).limit(2);
    if (error) return errorResponse('Unable to verify AI profile selection', 503);
    if (data?.length === 1 && data[0].ai_enabled === true) return null;
    return errorResponse('Select a player before using this feature', 403, { ai_not_enabled: true });
  }
  const tag = aiPlayerTag(playerTag);
  if (!tag) return errorResponse('A valid player tag is required', 400);
  const { data, error } = await db.from('player_profiles').select('ai_enabled')
    .eq('user_id', userId).in('player_tag', [tag, '#' + tag]).eq('ai_enabled', true).limit(1).maybeSingle();
  if (error) return errorResponse('Unable to verify AI profile selection', 503);
  return data?.ai_enabled === true ? null : errorResponse('AI not enabled for this account', 403, { ai_not_enabled: true, player_tag: tag });
}
