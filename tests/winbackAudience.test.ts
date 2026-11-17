import { describe, expect, test } from 'bun:test';
import { canResendWinback, consentStateKey, emailWinback, inAppWinback } from '../src/lib/winbackAudience';

const NOW = new Date('2026-11-17T12:00:00Z');
const daysAgo = (d: number, ms = 0) => new Date(NOW.getTime() - d * 86_400_000 - ms).toISOString();
type R = { user_id: string; segment: string; email: string | null; trial_start: string };
const row = (user_id: string, segment: string, trial_start: string): R => ({ user_id, segment, email: `${user_id}@example.test`, trial_start });

// Full history; a period filter mimics admin_trial_conversion(p_days).
const all: R[] = [
  row('A', 'expired_winback', daysAgo(10)),
  row('A', 'expired_winback', daysAgo(9)),   // A's second tag / duplicate trial row
  row('B', 'expired_winback', daysAgo(12)),
  row('C', 'paid', daysAgo(15)),
  row('D', 'expired_winback', daysAgo(20)),
  row('E', 'expired_winback', daysAgo(60)),
];
const period = (days: number) => all.filter(r => Date.parse(r.trial_start) >= NOW.getTime() - days * 86_400_000);
// Server recipients: B lacks consent, C is paid, so neither is listed.
const server = [
  { id: 'A', winback_email_sent_at: null },
  { id: 'D', winback_email_sent_at: daysAgo(10) },
  { id: 'E', winback_email_sent_at: null },
];

describe('win-back audience', () => {
  test('30-day period: 3 in-app, 1 email', () => {
    const inApp = inAppWinback(period(30));
    expect(inApp.map(r => r.user_id)).toEqual(['A', 'B', 'D']);
    expect(emailWinback(inApp, server, NOW).map(r => r.user_id)).toEqual(['A']);
  });
  test('sending disabled (no recipients) gives 3 / 0', () => {
    const inApp = inAppWinback(period(30));
    expect(inApp.length).toBe(3);
    expect(emailWinback(inApp, [], NOW).length).toBe(0);
  });
  test('withdrawn, blocked or past-due accounts are absent from server list and excluded', () => {
    const inApp = inAppWinback(period(30));
    const withoutA = server.filter(c => c.id !== 'A');
    expect(emailWinback(inApp, withoutA, NOW).length).toBe(0);
    expect(inAppWinback([row('P', 'payment_recovery', daysAgo(5))]).length).toBe(0);
  });
  test('E only in a period that covers it', () => {
    expect(inAppWinback(period(30)).some(r => r.user_id === 'E')).toBe(false);
    const ninety = inAppWinback(period(90));
    expect(ninety.some(r => r.user_id === 'E')).toBe(true);
    expect(emailWinback(ninety, server, NOW).map(r => r.user_id)).toEqual(['A', 'E']);
  });
  test('30-day resend threshold', () => {
    expect(canResendWinback(null, NOW)).toBe(true);
    expect(canResendWinback(daysAgo(30), NOW)).toBe(false);
    expect(canResendWinback(daysAgo(30, -1), NOW)).toBe(false);
    expect(canResendWinback(daysAgo(30, 1), NOW)).toBe(true);
  });
  test('unknown consent states fall back to unknown', () => {
    expect(consentStateKey('none')).toBe('marketing.state.unknown');
    expect(consentStateKey(null)).toBe('marketing.state.unknown');
    expect(consentStateKey('granted')).toBe('marketing.state.granted');
  });
});
