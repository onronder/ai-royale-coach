import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

// Keep the existing funnel and onboarding signal. Analytics failures must not affect a player's result.
export async function recordTrialUsage(db: SupabaseClient, userId: string, feature: string) {
  try {
    const { error } = await db.from('daily_usage_logs').insert({
      user_id: userId, player_tag: '', feature_name: 'ai_trial', metadata: { feature },
    });
    if (error) console.warn('Unable to record trial usage', feature, error.code);
  } catch {
    console.warn('Unable to record trial usage', feature);
  }
}
