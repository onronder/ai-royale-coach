import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse('Unauthorized', 401);
    }

    const userId = claimsData.claims.sub;

    // Fetch user's subscription to get polar_subscription_id
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscription, error: subError } = await adminClient
      .from('user_subscriptions')
      .select('polar_subscription_id, status')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription) {
      return errorResponse('No subscription found', 404);
    }

    if (!subscription.polar_subscription_id) {
      return errorResponse('No Polar subscription ID found', 400);
    }

    if (subscription.status === 'cancelled') {
      return errorResponse('Subscription is already cancelled', 400);
    }

    // Call Polar API to cancel the subscription
    const polarAccessToken = Deno.env.get('POLAR_ACCESS_TOKEN');
    if (!polarAccessToken) {
      console.error('POLAR_ACCESS_TOKEN not configured');
      return errorResponse('Server configuration error', 500);
    }

    const polarResponse = await fetch(
      `https://api.polar.sh/v1/subscriptions/${subscription.polar_subscription_id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${polarAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!polarResponse.ok) {
      const errorBody = await polarResponse.text();
      console.error('Polar API error:', polarResponse.status, errorBody);
      return errorResponse('Failed to cancel subscription with payment provider', 502);
    }

    // Polar will fire a subscription.canceled webhook which updates the database
    // We don't update the database here to avoid race conditions with the webhook

    console.log(`Subscription cancelled for user ${userId}, polar_subscription_id: ${subscription.polar_subscription_id}`);

    return jsonResponse({ success: true, message: 'Subscription cancellation initiated' });
  } catch (err) {
    console.error('cancel-subscription error:', err instanceof Error ? err.message : String(err));
    return errorResponse('Internal server error', 500);
  }
});
