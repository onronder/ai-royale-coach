import { supabase } from '@/integrations/supabase/client';

/** Must match the immutable texts stored server-side for this version (checked by tests). */
export const MARKETING_TEXT_VERSION = '2026-11-v1';
export const MARKETING_LANGUAGES = ['en', 'tr', 'es', 'fr', 'pt'] as const;
export type MarketingState = 'not_asked' | 'pending' | 'granted' | 'declined' | 'withdrawn' | 'expired';
export type MarketingSource = 'signup_confirm' | 'google_first' | 'coach_invite' | 'preferences';
export interface MarketingConsent { state: MarketingState; verified: boolean; since: string | null; invite: boolean; provider: string | null }
export interface SetResult { status: 'ok' | 'conflict' | 'unverified'; state: MarketingState; repeat?: boolean }

export function consentLanguage(lng: string | undefined): (typeof MARKETING_LANGUAGES)[number] {
  const base = (lng ?? 'en').slice(0, 2) as (typeof MARKETING_LANGUAGES)[number];
  return MARKETING_LANGUAGES.includes(base) ? base : 'en';
}
export const newRequestKey = () => crypto.randomUUID();

export async function getMarketingConsent(): Promise<MarketingConsent> {
  const { data, error } = await supabase.rpc('get_my_marketing_consent' as never);
  if (error) throw error;
  return data as unknown as MarketingConsent;
}

/** One click = one request key, reused on retry so a repeated or delayed request records nothing new. */
export async function setMarketingConsent(action: 'grant' | 'decline' | 'withdraw', source: MarketingSource, expected: MarketingState,
  language: string, requestKey: string): Promise<SetResult> {
  const { data, error } = await supabase.rpc('set_my_marketing_consent' as never, {
    p_action: action, p_source: source, p_language: consentLanguage(language), p_text_version: MARKETING_TEXT_VERSION,
    p_request_key: requestKey, p_expected: expected,
  } as never);
  if (error) throw error;
  return data as unknown as SetResult;
}

export async function markMarketingPrompt(action: 'shown' | 'dismissed') {
  const { error } = await supabase.rpc('mark_marketing_prompt' as never, { p_action: action } as never);
  if (error) throw error;
}
