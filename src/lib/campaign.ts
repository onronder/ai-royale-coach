/** Black Friday 2026: 75% off with Polar code, ends 30 Nov 23:59:59 Europe/Istanbul (UTC+3). */
export const BLACK_FRIDAY = {
  code: 'BLACKROYALE75',
  percent: 75,
  endsAt: Date.parse('2026-11-30T20:59:59.999Z'),
} as const;

export function isBlackFridayActive(now: number = Date.now()): boolean {
  return now <= BLACK_FRIDAY.endsAt;
}

export function timeLeft(now: number = Date.now()) {
  const ms = Math.max(0, BLACK_FRIDAY.endsAt - now);
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
