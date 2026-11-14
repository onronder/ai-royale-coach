// Single source of truth for "does this subscription row grant access right now?".
// Used by get-subscription-status (app gate + Settings) and ai-access (AI features).
// Kept dependency-free so it can be unit-tested from the web project.
export interface SubscriptionRow {
  status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  ends_at?: string | null;
}

export type AccessKind = 'paid' | 'trial' | 'none';

export function subscriptionAccess(sub: SubscriptionRow | null | undefined, now: Date = new Date()): AccessKind {
  if (!sub?.status) return 'none';
  const end = sub.ends_at || sub.current_period_end;
  const endInFuture = !!end && new Date(end) > now;
  // Renewal turned off: access continues exactly until the period/ends_at date.
  if (sub.cancel_at_period_end && !endInFuture) return 'none';
  if (sub.status === 'trialing') return endInFuture ? 'trial' : 'none';
  if (sub.status === 'active') return 'paid';
  // cancelled / expired / past_due / anything else: no new access.
  return 'none';
}
