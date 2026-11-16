export type PlanSummaryInput = {
  isAdmin: boolean;
  isTrialActive: boolean;
  subscriptionStatus: string | null;
  accountSlots: number;
};

export type PlanSummary =
  | { kind: 'admin' }
  | { kind: 'trial' }
  | { kind: 'paid'; aiTags: number }
  | { kind: 'none' };

/** Presentation only: admin comes from the real role, never from the slot count. */
export function planSummary({ isAdmin, isTrialActive, subscriptionStatus, accountSlots }: PlanSummaryInput): PlanSummary {
  if (isAdmin) return { kind: 'admin' };
  if (isTrialActive) return { kind: 'trial' };
  if (subscriptionStatus === 'active' && accountSlots > 0) return { kind: 'paid', aiTags: accountSlots };
  return { kind: 'none' };
}
