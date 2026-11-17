/** Shared, read-only win-back audience rules for the admin screens. No sends, no consent logic. */
/** Server-side rule (claim_winback_delivery / winback_cooldown_at): a new win-back email needs the last provider-accepted
 * one to be MORE than 720 hours old, and no uncertain attempt in another campaign. The admin screens only read the
 * server's decision for "now" (UTC instant), so they cannot disagree with the sender in any time zone. */
export const WINBACK_COOLDOWN_HOURS = 720;

export type WinbackCandidateLite = {
  id: string;
  winback_email_sent_at: string | null;
  winback_allowed?: boolean | null;
  winback_block_reason?: string | null;
  winback_next_eligible_at?: string | null;
};

/** True only when the server says this account can receive a new win-back email now. */
export function canSendWinback(c: Pick<WinbackCandidateLite, 'winback_allowed'> | null | undefined): boolean {
  return c?.winback_allowed === true;
}

export type TrialRowLite = { user_id: string | null; segment: string | null; email: string | null };

/** Expired win-back accounts in the selected period, one per account. */
export function inAppWinback<T extends TrialRowLite>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(r => r.segment === 'expired_winback' && !!r.user_id && !seen.has(r.user_id) && (seen.add(r.user_id), true));
}

/** In-app candidates the server also lists as email recipients right now (server cooldown decision). Matches by account id only. */
export function emailWinback<T extends TrialRowLite>(inApp: readonly T[], candidates: readonly WinbackCandidateLite[]): T[] {
  const byId = new Map(candidates.map(c => [c.id, c]));
  return inApp.filter(r => { const c = r.user_id ? byId.get(r.user_id) : undefined; return canSendWinback(c); });
}

const CONSENT_STATES = new Set(['not_asked', 'pending', 'granted', 'declined', 'withdrawn', 'expired']);
/** Known consent states keep their key; anything else (null, '', 'none', …) shows as unknown. */
export function consentStateKey(state: string | null | undefined): string {
  return 'marketing.state.' + (state && CONSENT_STATES.has(state) ? state : 'unknown');
}
