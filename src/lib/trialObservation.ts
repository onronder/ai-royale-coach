import { supabase } from '@/integrations/supabase/client';

export function observeTrialStep(step: 'app_opened' | 'coach_card_seen' | 'recommendation_requested') {
  // The observation must not block navigation, coaching or retry a player action.
  void Promise.resolve(supabase.rpc('observe_trial_step', { p_step: step })).catch(() => {});
}
