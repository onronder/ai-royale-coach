import { routeBillingRequest } from './recovery.ts';
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
    const polarAccessToken = Deno.env.get('POLAR_ACCESS_TOKEN')!;
    
    // Get product IDs for each tier
    const productIds: Record<number, string> = {
      1: Deno.env.get('POLAR_PRODUCT_ID_1')!,
      2: Deno.env.get('POLAR_PRODUCT_ID_2')!,
      3: Deno.env.get('POLAR_PRODUCT_ID_3')!,
    };

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { successUrl, accountSlots = 1, discountId, recovery } = await req.json();
    const { data: subscription, error: readError } = await supabase.from('user_subscriptions')
      .select('status,polar_customer_id').eq('user_id', user.id).maybeSingle();
    if (readError) return errorResponse('Subscription status unavailable', 503);
    const customer = subscription?.polar_customer_id
      ? { customer_id: subscription.polar_customer_id } : { external_customer_id: user.id };
    const billing = await routeBillingRequest(subscription?.status ?? null, recovery === true, customer, polarAccessToken);
    if (billing) {
      if ('error' in billing) return errorResponse(billing.error, billing.status);
      const response = jsonResponse({ ...billing, kind: 'recovery' });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    
    // Validate accountSlots
    const slots = Math.min(Math.max(1, accountSlots), 3);
    const polarProductId = productIds[slots];
    
    if (!polarProductId) {
      logger.error('No product ID configured', { slots });
      return errorResponse('Invalid tier selected', 400);
    }
    
    // Default success URL if not provided
    const finalSuccessUrl = successUrl || `${req.headers.get('origin')}/select-player?subscription=success`;

    logger.info('Creating checkout', { 
      userId: user.id, 
      slots, 
      productId: polarProductId,
      discountId: discountId || 'none'
    });

    // Create checkout session via Polar API
    const checkoutResponse = await fetch('https://api.polar.sh/v1/checkouts/custom/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${polarAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: polarProductId,
        success_url: finalSuccessUrl,
        customer_email: user.email,
        customer_external_id: user.id,
        metadata: {
          user_id: user.id,
          account_slots: slots,
        },
        // Pre-apply discount if provided, otherwise allow manual code entry
        ...(discountId && { discount_id: discountId }),
        allow_discount_codes: !discountId,
      }),
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      logger.error('Polar API error', { error: errorText });
      return errorResponse('Failed to create checkout', 500);
    }

    const checkoutData = await checkoutResponse.json();
    const checkoutUrl = checkoutData.url;

    if (!checkoutUrl) {
      logger.error('No checkout URL in response', { response: checkoutData });
      return errorResponse('Invalid checkout response', 500);
    }

    // Only actual checkout creation counts; opening the recovery portal exits above.
    // Analytics failure must not discard a valid checkout URL.
    try {
      const service = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const [returnStep, acquisitionStep] = await Promise.all([
        service.rpc('record_return_checkout', { p_user: user.id }),
        service.rpc('record_checkout_created', { p_user: user.id }),
      ]);
      if (returnStep.error) logger.warn('Return checkout observation unavailable');
      if (acquisitionStep.error) logger.warn('Acquisition checkout observation unavailable');
    } catch {
      logger.warn('Return checkout observation unavailable');
    }

    logger.info('Polar checkout created', { userId: user.id, slots });

    return jsonResponse({ checkoutUrl });
  } catch (error) {
    logger.error('Checkout error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
