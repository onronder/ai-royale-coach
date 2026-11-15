// Reminder links only carry a player tag. The selector checks account ownership after login.
export function coachingReturnTag(value: string | null): string | null {
  return value && /^[0289PYLQGRJCUV]{3,15}$/i.test(value) ? value.toUpperCase() : null;
}
