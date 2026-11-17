// Pure helpers for the admin signup-to-revenue report. Counts come from the server; this file never derives money.
export type FunnelCounts = Record<string, number>;

/** Acquisition order. `ui` steps are measured only for signups after the measurement start. */
export const FUNNEL_STEPS = [
  { key: 'signups', ui: false },
  { key: 'verified', ui: false },
  { key: 'offer_seen', ui: true },
  { key: 'trial_clicked', ui: true },
  { key: 'pricing_shown', ui: true },
  { key: 'continue_clicked', ui: true },
  { key: 'checkout_created', ui: true },
  { key: 'trial_started', ui: false },
  { key: 'first_paid', ui: false },
  { key: 'first_renewal', ui: false },
] as const;

/** Conversion rate; null (shown as "—") when the denominator is 0. */
export function rate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

export function formatRate(value: number | null, locale: string) {
  return value === null ? '—' : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

export type StepLoss = { from: string; to: string; lost: number; rate: number };

export type Transitions = Record<string, { entered: number; advanced: number }>;

export function biggestLoss(transitions: Transitions): StepLoss | null {
  let best: StepLoss | null = null;
  for (let i = 1; i < FUNNEL_STEPS.length; i++) {
    const to = FUNNEL_STEPS[i].key;
    const pair = transitions[to];
    if (!pair || pair.entered <= 0) continue;
    const lost = pair.entered - pair.advanced;
    if (lost > 0 && (!best || lost > best.lost)) {
      best = { from: FUNNEL_STEPS[i - 1].key, to, lost, rate: lost / pair.entered };
    }
  }
  return best;
}

/** Today's date in Europe/Istanbul as YYYY-MM-DD (reporting zone; storage stays UTC). */
export function istanbulDate(at: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(at);
}

export function shiftDate(ymd: string, days: number) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Money per currency, never summed across currencies. */
export function formatCents(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
