import { subscriptionAccess } from './subscription-access.ts';
// deno-lint-ignore-file no-explicit-any
export interface AiAccessResult {
  allowed: boolean;
  isAdmin: boolean;
  isPaid: boolean;
  isTrial: boolean;
}

export async function checkAiAccess(supabase: any, userId: string): Promise<AiAccessResult> {
  const base = { allowed: false, isAdmin: false, isPaid: false, isTrial: false };
  const now = new Date();

  const { data: isAdminUser } = await supabase.rpc('is_admin', { p_user_id: userId });
  if (isAdminUser === true) return { ...base, allowed: true, isAdmin: true };

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end, cancel_at_period_end, ends_at')
    .eq('user_id', userId)
    .maybeSingle();

  const kind = subscriptionAccess(sub, now);
  if (kind === 'paid') return { ...base, allowed: true, isPaid: true };

  let isTrial = kind === 'trial';
  if (!isTrial) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, trial_used')
      .eq('id', userId)
      .maybeSingle();
    isTrial = !!profile?.trial_ends_at && !profile.trial_used && new Date(profile.trial_ends_at) > now;
  }
  return isTrial ? { ...base, allowed: true, isTrial: true } : base;
}
