import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { enabledProfileIds } = await req.json();
    
    if (!Array.isArray(enabledProfileIds)) {
      return errorResponse('enabledProfileIds must be an array', 400);
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's subscription to check account_slots
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('account_slots, status')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return errorResponse('No active subscription found', 400);
    }

    // Check subscription is active
    if (!['active', 'trialing', 'cancelled'].includes(subscription.status)) {
      return errorResponse('Subscription not active', 400);
    }

    // Validate selection count against account_slots
    if (enabledProfileIds.length > subscription.account_slots) {
      return errorResponse(`Cannot enable AI on more than ${subscription.account_slots} accounts`, 400, { maxSlots: subscription.account_slots });
    }

    // Get user's profiles to verify ownership
    const { data: profiles, error: profilesError } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('user_id', user.id);

    if (profilesError) {
      logger.error('Error fetching profiles', { error: profilesError.message });
      return errorResponse('Failed to fetch profiles', 500);
    }

    const userProfileIds = profiles?.map(p => p.id) || [];
    
    // Verify all provided profile IDs belong to user
    const invalidIds = enabledProfileIds.filter(id => !userProfileIds.includes(id));
    if (invalidIds.length > 0) {
      return errorResponse('Invalid profile IDs provided', 400);
    }

    // Disable AI on all user's profiles first
    const { error: disableError } = await supabase
      .from('player_profiles')
      .update({ ai_enabled: false })
      .eq('user_id', user.id);

    if (disableError) {
      logger.error('Error disabling AI', { error: disableError.message });
      return errorResponse('Failed to update profiles', 500);
    }

    // Enable AI on selected profiles
    if (enabledProfileIds.length > 0) {
      const { error: enableError } = await supabase
        .from('player_profiles')
        .update({ ai_enabled: true })
        .in('id', enabledProfileIds);

      if (enableError) {
        logger.error('Error enabling AI', { error: enableError.message });
        return errorResponse('Failed to enable AI on profiles', 500);
      }
    }

    // Clear the needs_ai_selection flag
    await supabase
      .from('user_subscriptions')
      .update({ needs_ai_selection: false })
      .eq('user_id', user.id);

    logger.info('Updated AI access', { userId: user.id, enabledCount: enabledProfileIds.length });

    return jsonResponse({ 
      success: true,
      enabledCount: enabledProfileIds.length,
      maxSlots: subscription.account_slots
    });

  } catch (error) {
    logger.error('Manage AI accounts error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
