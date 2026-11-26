import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { logger } from '../_shared/logger.ts';

// Extended CORS headers for webhook-specific headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
};

// Subscription data structure from Polar webhook
interface PolarSubscription {
  id?: string;
  modified_at?: string;
  created_at?: string;
  canceled_at?: string;
  ends_at?: string;
  customer?: {
    id?: string;
    external_id?: string;
  };
  metadata?: {
    user_id?: string;
  };
  user?: {
    id?: string;
  };
  status?: string;
  cancel_at_period_end?: boolean;
  product_id?: string;
  current_period_start?: string;
  current_period_end?: string;
}

interface PolarOrder extends Pick<PolarSubscription, 'id' | 'customer' | 'metadata' | 'status'> {
  customer_id?: string;
  subscription_id?: string;
  created_at?: string;
  modified_at?: string;
  net_amount?: number;
  amount?: number;
  total_amount?: number;
  tax_amount?: number;
  refunded_amount?: number;
  discount_amount?: number;
  currency?: string;
  billing_reason?: string;
  paid?: boolean;
}

type WebhookEvent = { timestamp?: string } & (
  | { type: `subscription.${string}`; data: PolarSubscription }
  | { type: `order.${string}`; data: PolarOrder }
  | { type: `checkout.${string}`; data: { id?: string } }
);

// Extract user ID from subscription data with multiple fallbacks
function extractUserId(subscription: PolarSubscription): string | null {
  // Try customer.external_id first (primary method for Polar)
  if (subscription?.customer?.external_id && typeof subscription.customer.external_id === 'string') {
    return subscription.customer.external_id;
  }
  
  // Fallback to metadata.user_id
  if (subscription?.metadata?.user_id && typeof subscription.metadata.user_id === 'string') {
    return subscription.metadata.user_id;
  }
  
  // Fallback to user.id if present
  if (subscription?.user?.id && typeof subscription.user.id === 'string') {
    return subscription.user.id;
  }
  
  return null;
}

// Validate required environment variables
function validateEnv(): { valid: boolean; missing: string[] } {
  const required = ['POLAR_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !Deno.env.get(key));
  return { valid: missing.length === 0, missing };
}

function slotCount(productId?: string): number | null {
  if (!productId) return null;
  const products = [1, 2, 3].map(n => Deno.env.get('POLAR_PRODUCT_ID_' + n));
  const index = products.indexOf(productId);
  if (index >= 0) return index + 1;
  if (products.some(id => !id)) throw new Error('Polar product configuration incomplete');
  return null;
}

function mappedStatus(status?: string): string | null {
  if (status === 'active' || status === 'trialing' || status === 'past_due') return status;
  if (status === 'canceled' || status === 'cancelled') return 'cancelled';
  if (['revoked', 'ended', 'incomplete_expired', 'unpaid'].includes(status ?? '')) return 'expired';
  return null;
}

async function logWebhookEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  eventType: string,
  eventId: string | null | undefined,
  userId: string | null,
  status: 'processed' | 'failed' | 'skipped',
  errorMessage?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payloadSummary?: Record<string, any>
) {
  try {
    await supabase.from('webhook_events').insert({
      event_type: eventType,
      event_id: eventId,
      user_id: userId,
      status,
      error_message: errorMessage || null,
      payload_summary: payloadSummary || null,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to log webhook event', { error: errorMsg });
  }
}

serve(async (req) => {
  // Generate request ID for logging
  const requestId = crypto.randomUUID().slice(0, 8);
  const log = (level: string, message: string, data?: any) => {
    const logData = { requestId, timestamp: new Date().toISOString(), ...data };
    if (level === 'error') {
      console.error(`[${requestId}] ${message}`, JSON.stringify(logData));
    } else if (level === 'warn') {
      console.warn(`[${requestId}] ${message}`, JSON.stringify(logData));
    } else {
      console.log(`[${requestId}] ${message}`, JSON.stringify(logData));
    }
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment
    const envCheck = validateEnv();
    if (!envCheck.valid) {
      log('error', 'Missing environment variables', { missing: envCheck.missing });
      return new Response(JSON.stringify({ error: 'Server configuration error', requestId }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get webhook headers
    const webhookId = req.headers.get('webhook-id');
    const webhookTimestamp = req.headers.get('webhook-timestamp');
    const webhookSignature = req.headers.get('webhook-signature');

    log('info', 'Webhook received', { 
      webhookId,
      hasTimestamp: !!webhookTimestamp,
      hasSignature: !!webhookSignature
    });

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      log('error', 'Missing webhook headers');
      return new Response(JSON.stringify({ error: 'Missing webhook headers', requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read payload
    const payload = await req.text();
    if (!payload) {
      log('error', 'Empty payload received');
      return new Response(JSON.stringify({ error: 'Empty payload', requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Polar webhook secrets: the standardwebhooks library expects a base64-encoded secret
    // Per Polar SDK source: we must base64-encode the ENTIRE secret (including polar_whs_ prefix)
    const secretKey = webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : btoa(webhookSecret);

    // Initialize Webhook verifier
    let wh: Webhook;
    try {
      wh = new Webhook(secretKey);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log('error', 'Failed to initialize Webhook verifier', { 
        error: errorMsg
      });
      return new Response(JSON.stringify({ 
        error: 'Webhook configuration error', 
        details: 'Failed to initialize signature verifier',
        requestId 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify webhook signature
    let event: WebhookEvent;
    try {
      event = wh.verify(payload, {
        'webhook-id': webhookId,
        'webhook-timestamp': webhookTimestamp,
        'webhook-signature': webhookSignature,
      }) as WebhookEvent;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log('error', 'Webhook signature verification failed', { 
        error: errorMsg,
        webhookId
      });
      return new Response(JSON.stringify({ 
        error: 'Invalid signature', 
        details: errorMsg,
        requestId 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log('info', 'Webhook verified', { eventType: event.type });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process event
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.updated':
      case 'subscription.canceled':
      case 'subscription.uncanceled':
      case 'subscription.revoked':
      case 'subscription.ended':
      case 'subscription.past_due': {
        const sub = event.data as PolarSubscription;
        const owner = extractUserId(sub);
        const userId = owner && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(owner) ? owner : null;
        // Publication and delivery time are separate from the subscription's resource clock.
        const providerTime = sub.modified_at || sub.created_at;
        const resourceCreatedAt = sub.created_at && Number.isFinite(Date.parse(sub.created_at)) ? sub.created_at : null;
        const starts = event.type === 'subscription.created' || event.type === 'subscription.active';
        const uncanceled = event.type === 'subscription.uncanceled';
        let decision: string;
        let accountSlots: number | null;
        try {
          accountSlots = starts || event.type === 'subscription.updated' ? slotCount(sub.product_id) : null;
          const result = await supabase.rpc('apply_polar_subscription_event', {
            p_user_id: userId, p_subscription_id: sub.id ?? null, p_kind: event.type,
            p_event_at: providerTime && Number.isFinite(Date.parse(providerTime)) ? providerTime : null,
            p_delivery_id: webhookId,
            p_fields: {
              provider_status: sub.status, provider_created_at: resourceCreatedAt, status: mappedStatus(sub.status), account_slots: accountSlots,
              customer_id: sub.customer?.id, product_id: sub.product_id,
              current_period_start: sub.current_period_start, current_period_end: sub.current_period_end,
              cancel_at_period_end: !uncanceled && !!sub.cancel_at_period_end,
              canceled_at: uncanceled ? null : sub.canceled_at ?? null,
              ends_at: uncanceled ? null : sub.ends_at ?? (sub.cancel_at_period_end ? sub.current_period_end : null),
            },
          });
          if (result.error || typeof result.data !== 'string') throw new Error('Subscription write unavailable');
          decision = result.data;
        } catch {
          log('error', 'Could not commit subscription event', { eventType: event.type });
          return new Response(JSON.stringify({ error: 'Subscription processing unavailable', requestId }), {
            status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!userId || !['created', 'applied', 'ended'].includes(decision)) break;
        const sendConfirmation = starts && decision === 'created' && sub.status === 'active';
        const checkPaymentFailure = event.type === 'subscription.updated' && sub.status === 'past_due';
        if (!sendConfirmation && !checkPaymentFailure && decision !== 'ended') break;

        // The state and its receipt have committed. Keep service notices on their existing route.
        try {
          if (checkPaymentFailure) {
            const { data: recent, error } = await supabase.from('webhook_events').select('created_at')
              .eq('user_id', userId).eq('event_type', 'payment_failed_email_sent')
              .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()).limit(1);
            if (error || recent?.length) break;
          }
          const { data: profile } = await supabase.from('profiles').select('email, preferred_language').eq('id', userId).single();
          if (!profile?.email) break;
          const notice = sendConfirmation
            ? { type: 'subscription', subscriptionData: { accountSlots, renewalDate: sub.current_period_end } }
            : checkPaymentFailure
              ? { type: 'payment_failed', updatePaymentUrl: 'https://polar.sh/purchases/subscriptions' }
              : { type: 'trial_expired' };
          const { error } = await supabase.functions.invoke('send-email', {
            body: { ...notice, email: profile.email, language: profile.preferred_language || 'en' },
          });
          if (error) log('warn', 'Subscription notice unavailable', { type: notice.type });
          else if (checkPaymentFailure) await logWebhookEvent(supabase, 'payment_failed_email_sent', null, userId, 'processed');
        } catch {
          log('warn', 'Subscription notice unavailable', { eventType: event.type });
        }
        break;
      }

      case 'checkout.created':
      case 'checkout.updated': {
        log('info', 'Checkout event received', { checkoutId: event.data?.id });
        break;
      }

      case 'order.created':
      case 'order.updated':
      case 'order.paid':
      case 'order.refunded': {
        const order = event.data;
        log('info', `Order event: ${event.type}`, { orderId: order?.id });
        const orderUserId = order?.customer?.external_id || order?.metadata?.user_id || null;
        if (order?.id) {
          // Idempotent: one row per Polar order id, latest state wins.
          const { error: oErr } = await supabase.from('polar_orders').upsert({
            order_id: order.id,
            user_id: orderUserId,
            customer_id: order.customer_id || order.customer?.id || null,
            subscription_id: order.subscription_id || null,
            amount: order.net_amount ?? order.amount ?? order.total_amount ?? 0,
            gross_amount: order.total_amount ?? null,
            tax_amount: order.tax_amount ?? null,
            currency: order.currency || null,
            billing_reason: order.billing_reason || null,
            status: order.status || (event.type === 'order.refunded' ? 'refunded' : order.paid ? 'paid' : null),
            discount_amount_cents: order.discount_amount ?? null,
            refunded_net_cents: order.refunded_amount ?? null,
            provider_updated_at: order.modified_at || event.timestamp || order.created_at || null,
            ...(event.type === 'order.paid' && event.timestamp ? { paid_at: event.timestamp } : {}),
            created_at: order.created_at || new Date().toISOString(),
          }, { onConflict: 'order_id' });
          if (oErr) {
            await logWebhookEvent(supabase, event.type, order.id, orderUserId, 'failed', oErr.message);
            throw new Error('Failed to record Polar order');
          }
        }
        await logWebhookEvent(supabase, event.type, order?.id, orderUserId, 'processed', undefined, {
          orderId: order?.id, amount: order?.net_amount ?? order?.amount, billingReason: order?.billing_reason,
        });
        break;
      }

      default:
        log('warn', 'Unhandled event type', { eventType: event.type });
    }

    return new Response(JSON.stringify({ received: true, requestId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[${requestId}] Polar webhook fatal error:`, { error: errorMessage, stack: errorStack });
    
    return new Response(JSON.stringify({ error: errorMessage, requestId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
