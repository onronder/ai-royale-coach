import { describe, expect, it } from 'vitest';
import { biggestLoss, istanbulDate, rate, formatRate } from '../src/lib/revenueFunnel';

describe('revenue funnel', () => {
  it('shows a dash instead of a rate when the denominator is 0', () => {
    expect(rate(0, 0)).toBeNull();
    expect(formatRate(rate(3, 0), 'tr')).toBe('—');
    expect(rate(1, 4)).toBe(0.25);
  });
  it('compares transitions of the same accounts in chronological order', () => {
    expect(biggestLoss({ verified: { entered: 10, advanced: 9 }, trial_clicked: { entered: 4, advanced: 1 } }))
      .toEqual({ from: 'offer_seen', to: 'trial_clicked', lost: 3, rate: 0.75 });
  });
  it('does not infer a loss from unobserved or empty transitions', () => {
    expect(biggestLoss({ offer_seen: { entered: 0, advanced: 0 } })).toBeNull();
  });
  it('reports dates in Istanbul time (UTC+3)', () => {
    expect(istanbulDate(new Date('2026-11-17T21:30:00Z'))).toBe('2026-11-18');
    expect(istanbulDate(new Date('2026-11-17T20:59:00Z'))).toBe('2026-11-17');
  });
});
