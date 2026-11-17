import { describe, expect, it } from 'vitest';
import { biggestLoss, istanbulDate, rate, formatRate } from '../src/lib/revenueFunnel';

describe('revenue funnel', () => {
  it('shows a dash instead of a rate when the denominator is 0', () => {
    expect(rate(0, 0)).toBeNull();
    expect(formatRate(rate(3, 0), 'tr')).toBe('—');
    expect(rate(1, 4)).toBe(0.25);
  });
  it('ignores unmeasured screen steps when finding the biggest loss', () => {
    const counts = { signups: 100, verified: 90, offer_seen: 0, trial_clicked: 0, pricing_shown: 0, continue_clicked: 0, checkout_created: 0, trial_started: 30, first_paid: 5, first_renewal: 2 };
    expect(biggestLoss(counts, 0)).toEqual({ from: 'verified', to: 'trial_started', lost: 60, rate: 60 / 90 });
  });
  it('uses measured screen steps when the whole cohort was measured', () => {
    const counts = { signups: 10, verified: 10, offer_seen: 9, trial_clicked: 3, pricing_shown: 3, continue_clicked: 2, checkout_created: 2, trial_started: 2, first_paid: 1, first_renewal: 0 };
    expect(biggestLoss(counts, 10)?.from).toBe('offer_seen');
  });
  it('reports dates in Istanbul time (UTC+3)', () => {
    expect(istanbulDate(new Date('2026-11-17T21:30:00Z'))).toBe('2026-11-18');
    expect(istanbulDate(new Date('2026-11-17T20:59:00Z'))).toBe('2026-11-17');
  });
});
