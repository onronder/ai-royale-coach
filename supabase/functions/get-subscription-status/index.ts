import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get subscription status
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get trial status from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trial_started_at, trial_ends_at, trial_used')
      .eq('id', user.id)
      .single();

    const now = new Date();
    let isTrialActive = false;
    let trialDaysRemaining = 0;

    if (profile && profile.trial_ends_at && !profile.trial_used) {
      const trialEnd = new Date(profile.trial_ends_at);
      if (trialEnd > now) {
        isTrialActive = true;
        trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const hasActiveSubscription = subscription?.status === 'active';
    const accountSlots = subscription?.account_slots || (isTrialActive ? 1 : 0);

    // Determine access level
    const hasAccess = hasActiveSubscription || isTrialActive;

    return new Response(JSON.stringify({
      hasAccess,
      subscription: subscription ? {
        status: subscription.status,
        accountSlots: subscription.account_slots,
        currentPeriodEnd: subscription.current_period_end,
      } : null,
      trial: {
        isActive: isTrialActive,
        daysRemaining: trialDaysRemaining,
        hasUsedTrial: profile?.trial_used || false,
        endsAt: profile?.trial_ends_at,
      },
      accountSlots,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
