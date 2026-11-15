export interface SummaryState { subscriptionId: string; optedIn: boolean; playerTag: string | null; taskId: string | null; sent: boolean; trialEndsAt: string }

const norm = (tag: string | null) => (tag ?? '').replace(/^#/, '').toUpperCase();

/** The box is on only when the saved choice is exactly the player and task on screen. */
export function summaryChecked(s: SummaryState, playerTag: string, taskId: string): boolean {
  return s.optedIn && norm(s.playerTag) === norm(playerTag) && s.taskId === taskId;
}

/** Mirrors update_trial_summary(off): removal applies only to the matching player and task. */
export function applySummaryOff(s: SummaryState, playerTag: string, taskId: string): SummaryState {
  return summaryChecked(s, playerTag, taskId) ? { ...s, optedIn: false, playerTag: null, taskId: null } : s;
}
