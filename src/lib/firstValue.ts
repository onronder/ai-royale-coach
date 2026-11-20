import { FirstValueError, readFirstValueResponse } from './firstValueResponse'
export { FirstValueError } from './firstValueResponse'
import { supabase } from '@/integrations/supabase/client'
import type { Task } from '@/components/coaching/FirstSessionTask'
import type { ClashRoyaleCard } from '@/services/clashRoyaleApi'
export interface FirstValueState {
  reason: 'open' | 'closed' | 'history' | 'blocked' | 'unverified'
  enabled: boolean
  can_start: boolean
  can_read: boolean
  outcome: 'available' | 'ready' | 'uncertain' | 'failed'
  task: (Task & { player_tag: string; last_checked_at?: string }) | null
}
export interface FirstValueResponse extends FirstValueState {
  player?: { tag: string; name: string; trophies: number; currentDeck: ClashRoyaleCard[] }
  deck_confirmation?: { cards: ClashRoyaleCard[] }
  translation?: Record<string, string>
  error?: string
}
export async function getFirstValue(): Promise<FirstValueState> {
  const { data, error } = await supabase.rpc('get_my_first_value')
  if (error) throw error
  return data as unknown as FirstValueState
}
export async function firstValueAction(
  action: string,
  language: string,
  extra: Record<string, unknown> = {},
): Promise<FirstValueResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new FirstValueError('unauthorized')
  return readFirstValueResponse(
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/first-value-coaching`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, language, ...extra }),
      signal: AbortSignal.timeout(110000),
    }),
  )
}
export function observeFirstValue(step: 'screen_seen' | 'tag_help' | 'offer_seen' | 'declined') {
  void Promise.resolve(supabase.rpc('record_first_value_step', { p_step: step })).catch(() => {})
}
export const FEEDBACK_REASONS = [
  'card',
  'renewal',
  'price',
  'value',
  'time',
  'technical',
  'other',
] as const
