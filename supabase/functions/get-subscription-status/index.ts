import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';

const defaultResponse = {
  hasAccess: false,
  subscription: null,
  trial: { isActive: false, daysRemaining: 0, hasUsedTrial: false, endsAt: null },
  accountSlots: 0,
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user from auth header - return default response if not authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.debug('No auth header, returning default response');
      return jsonResponse(defaultResponse);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.debug('Auth error or no user, returning default response', { error: authError?.message });
      return jsonResponse(defaultResponse);
    }

    // Get subscription status (now using polar_* columns)
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get trial status from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_started_at, trial_ends_at, trial_used')
      .eq('id', user.id)
      .single();

    const now = new Date();
    let isTrialActive = false;
    let trialDaysRemaining = 0;

    // Check Polar-managed trial (from subscription status)
    if (subscription?.status === 'trialing' && subscription.current_period_end) {
      const trialEnd = new Date(subscription.current_period_end);
      if (trialEnd > now) {
        isTrialActive = true;
        trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    // Fallback to profile-based trial (legacy support)
    else if (profile && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at);
      if (trialEnd > now) {
        isTrialActive = true;
        trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Active subscription includes: active, trialing, cancelled (still has access until period end)
    const hasActiveSubscription = ['active', 'trialing'].includes(subscription?.status || '');
    
    // Check if cancelled but still within period
    const cancelledButActive = subscription?.status === 'cancelled' && 
      subscription.current_period_end && 
      new Date(subscription.current_period_end) > now;

    const accountSlots = subscription?.account_slots || (isTrialActive ? 3 : 0);

    // Determine access level
    const hasAccess = hasActiveSubscription || isTrialActive || cancelledButActive;

    return jsonResponse({
      hasAccess,
      subscription: subscription ? {
        status: subscription.status,
        accountSlots: subscription.account_slots,
        currentPeriodEnd: subscription.current_period_end,
        polarSubscriptionId: subscription.polar_subscription_id,
        polarCustomerId: subscription.polar_customer_id,
        needsAISelection: subscription.needs_ai_selection || false,
      } : null,
      trial: {
        isActive: isTrialActive,
        daysRemaining: trialDaysRemaining,
        hasUsedTrial: profile?.trial_used || subscription?.status === 'trialing' || false,
        endsAt: subscription?.status === 'trialing' ? subscription.current_period_end : profile?.trial_ends_at,
      },
      accountSlots,
    });
  } catch (error) {
    logger.error('Get subscription status error', { error: error instanceof Error ? error.message : String(error) });
    // Return default response instead of error to prevent app crash
    return jsonResponse(defaultResponse);
  }
});
