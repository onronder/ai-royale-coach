import { supabase } from '@/integrations/supabase/client';

export type AcquisitionStep = 'trial_offer_seen' | 'trial_start_clicked' | 'pricing_shown' | 'polar_continue_clicked';

/**
 * Fire-and-forget first-acquisition observation. The server keeps only the first occurrence per account
 * and ignores accounts that already had a Polar subscription/order/trial. Never blocks or throws.
 */
export function recordAcquisitionStep(step: AcquisitionStep): void {
  try {
    void Promise.resolve(supabase.rpc('record_acquisition_step' as never, { p_step: step } as never)).catch(() => undefined);
  } catch {
    /* measurement must never affect sign-up or checkout */
  }
}
