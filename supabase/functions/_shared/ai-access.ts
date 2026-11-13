// deno-lint-ignore-file no-explicit-any
export const TRIAL_AI_WINDOW_HOURS = 24;
export const TRIAL_AI_LIMIT_PER_WINDOW = 1;
const TRIAL_FEATURE = 'ai_trial';

export interface AiAccessResult {
  allowed: boolean;
  isAdmin: boolean;
  isPaid: boolean;
  isTrial: boolean;
  trialLimitReached: boolean;
  nextAvailableAt: string | null;
}

/**
 * Central AI access check. Must be called with a service-role client.
 * - admin: unlimited
 * - active subscription: allowed (feature-specific quotas still apply)
 * - Polar trialing (or legacy grace trial): 1 AI request per 24h, shared across all AI features
 * Records the trial usage when a trial request is allowed.
 */
export async function checkAiAccess(supabase: any, userId: string, feature: string): Promise<AiAccessResult> {
  const base = { allowed: false, isAdmin: false, isPaid: false, isTrial: false, trialLimitReached: false, nextAvailableAt: null };
  const now = new Date();

  const { data: isAdminUser } = await supabase.rpc('is_admin', { p_user_id: userId });
  if (isAdminUser === true) return { ...base, allowed: true, isAdmin: true };

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (sub?.status === 'active') return { ...base, allowed: true, isPaid: true };

  let isTrial = sub?.status === 'trialing' && !!sub.current_period_end && new Date(sub.current_period_end) > now;
  if (!isTrial) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, trial_used')
      .eq('id', userId)
      .maybeSingle();
    isTrial = !!profile?.trial_ends_at && !profile.trial_used && new Date(profile.trial_ends_at) > now;
  }
  if (!isTrial) return base;

  const windowStart = new Date(now.getTime() - TRIAL_AI_WINDOW_HOURS * 3600_000).toISOString();
  const { data: recent } = await supabase
    .from('daily_usage_logs')
    .select('used_at')
    .eq('user_id', userId)
    .eq('feature_name', TRIAL_FEATURE)
    .gte('used_at', windowStart)
    .order('used_at', { ascending: true });

  if ((recent?.length || 0) >= TRIAL_AI_LIMIT_PER_WINDOW) {
    const next = new Date(new Date(recent[0].used_at).getTime() + TRIAL_AI_WINDOW_HOURS * 3600_000).toISOString();
    return { ...base, isTrial: true, trialLimitReached: true, nextAvailableAt: next };
  }

  await supabase.from('daily_usage_logs').insert({
    user_id: userId,
    player_tag: '',
    feature_name: TRIAL_FEATURE,
    metadata: { feature },
  });
  return { ...base, allowed: true, isTrial: true };
}
