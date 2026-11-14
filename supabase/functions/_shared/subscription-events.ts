/** True when an end/revoke event belongs to a subscription other than the user's current one. */
export function isStaleEndEvent(currentSubId: string | null | undefined, eventSubId: string | null | undefined): boolean {
  if (!currentSubId || !eventSubId) return false;
  return currentSubId !== eventSubId;
}
