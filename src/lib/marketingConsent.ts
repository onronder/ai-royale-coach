import { supabase } from '@/integrations/supabase/client';

/** Must match the immutable texts stored server-side for this version (checked by tests). */
export const MARKETING_TEXT_VERSION = '2026-11-v2';
export const MARKETING_LANGUAGES = ['en', 'tr', 'es', 'fr', 'pt'] as const;
export type MarketingState = 'not_asked' | 'pending' | 'granted' | 'declined' | 'withdrawn' | 'expired';
export type MarketingSource = 'signup_confirm' | 'google_first' | 'coach_invite' | 'preferences';
export interface MarketingConsent { state: MarketingState; verified: boolean; since: string | null; invite: boolean; access?: boolean; provider: string | null; collectionOpen: boolean; blocked: boolean }
export interface SetResult { status: 'ok' | 'conflict' | 'unverified' | 'collection_paused'; state: MarketingState; repeat?: boolean }

export function consentLanguage(lng: string | undefined): (typeof MARKETING_LANGUAGES)[number] {
  const base = (lng ?? 'en').slice(0, 2) as (typeof MARKETING_LANGUAGES)[number];
  return MARKETING_LANGUAGES.includes(base) ? base : 'en';
}
export const newRequestKey = () => crypto.randomUUID();

/** claimInvite: the Coach screen claims the once-per-account invite atomically; other screens read without claiming. */
/** Cache keys per purpose: the read-only preferences answer must never stand in for the Coach invite's claiming request. */
export const marketingConsentKey = (userId: string, purpose: 'coach' | 'prefs') => ['marketing-consent', userId, purpose] as const;

export async function getMarketingConsent(claimInvite = false): Promise<MarketingConsent> {
  const { data, error } = await supabase.rpc('get_my_marketing_consent' as never, { p_claim_invite: claimInvite } as never);
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

/** Consent collection is open only once the market and age rules are approved. Fails closed: hide the box on error. */
export async function getCollectionOpen(): Promise<boolean> {
  const { data, error } = await supabase.rpc('marketing_collection_open' as never);
  if (error) return false;
  return data === true;
}
