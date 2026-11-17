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

/**
 * Largest measured drop between consecutive steps. UI steps use only the measured part of the cohort,
 * so steps that were not measured never create a fake loss.
 */
export function biggestLoss(counts: FunnelCounts, uiMeasured: number): StepLoss | null {
  const usable = FUNNEL_STEPS.filter(s => !s.ui || uiMeasured > 0);
  let best: StepLoss | null = null;
  for (let i = 1; i < usable.length; i++) {
    const a = usable[i - 1], b = usable[i];
    // Comparing a whole-cohort step with a measured-only step is not a like-for-like drop.
    if (a.ui !== b.ui && (a.ui || b.ui) && uiMeasured !== (counts.signups ?? 0)) continue;
    const from = counts[a.key] ?? 0, to = counts[b.key] ?? 0;
    const lost = Math.max(0, from - to);
    const r = rate(lost, from);
    if (r !== null && lost > 0 && (!best || lost > best.lost)) best = { from: a.key, to: b.key, lost, rate: r };
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
