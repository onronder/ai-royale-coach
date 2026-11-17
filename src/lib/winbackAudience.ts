/** Shared, read-only win-back audience rules for the admin screens. No sends, no consent logic. */
export const WINBACK_RESEND_DAYS = 30;
const DAY_MS = 86_400_000;

/** True when no previous win-back email exists or the last one is strictly older than 30 days. */
export function canResendWinback(lastSentAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastSentAt) return true;
  const sent = Date.parse(lastSentAt);
  if (Number.isNaN(sent)) return false;
  return sent < now.getTime() - WINBACK_RESEND_DAYS * DAY_MS;
}

export type TrialRowLite = { user_id: string | null; segment: string | null; email: string | null };
export type WinbackCandidateLite = { id: string; winback_email_sent_at: string | null };

/** Expired win-back accounts in the selected period, one per account. */
export function inAppWinback<T extends TrialRowLite>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(r => r.segment === 'expired_winback' && !!r.user_id && !seen.has(r.user_id) && (seen.add(r.user_id), true));
}

/** In-app candidates the server also lists as email recipients today and outside the 30-day resend window. Matches by account id only. */
export function emailWinback<T extends TrialRowLite>(inApp: readonly T[], candidates: readonly WinbackCandidateLite[], now: Date = new Date()): T[] {
  const byId = new Map(candidates.map(c => [c.id, c]));
  return inApp.filter(r => { const c = r.user_id ? byId.get(r.user_id) : undefined; return !!c && canResendWinback(c.winback_email_sent_at, now); });
}

const CONSENT_STATES = new Set(['not_asked', 'pending', 'granted', 'declined', 'withdrawn', 'expired']);
/** Known consent states keep their key; anything else (null, '', 'none', …) shows as unknown. */
export function consentStateKey(state: string | null | undefined): string {
  return 'marketing.state.' + (state && CONSENT_STATES.has(state) ? state : 'unknown');
}
