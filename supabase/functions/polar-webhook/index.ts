import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';

// Extended CORS headers for webhook-specific headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
};

// Map product IDs to account slots with validation
function getAccountSlotsFromProductId(productId: string | undefined | null): number {
  if (!productId) {
    logger.warn('No product ID provided, defaulting to 1 slot');
    return 1;
  }

  const productId1 = Deno.env.get('POLAR_PRODUCT_ID_1');
  const productId2 = Deno.env.get('POLAR_PRODUCT_ID_2');
  const productId3 = Deno.env.get('POLAR_PRODUCT_ID_3');
  
  if (productId === productId1) return 1;
  if (productId === productId2) return 2;
  if (productId === productId3) return 3;
  
  logger.warn(`Unknown product ID: ${productId}, defaulting to 1 slot`);
  return 1;
}

// Subscription data structure from Polar webhook
interface PolarSubscription {
  id?: string;
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
  product_id?: string;
  current_period_start?: string;
  current_period_end?: string;
}

// Webhook event structure
interface WebhookEvent {
  type: string;
  data: PolarSubscription;
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = ReturnType<typeof createClient>;

// Log webhook event to database for monitoring
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
    let secretKey: string;
    if (webhookSecret.startsWith('polar_whs_')) {
      // Base64 encode the ENTIRE secret including the prefix
      secretKey = btoa(webhookSecret);
      log('info', 'Base64 encoded entire polar_whs_ secret', { 
        originalLength: webhookSecret.length,
        encodedLength: secretKey.length 
      });
    } else if (webhookSecret.startsWith('whsec_')) {
      // Supabase/Svix format: strip prefix (rest is already base64)
      secretKey = webhookSecret.slice(6);
      log('info', 'Stripped whsec_ prefix from webhook secret');
    } else {
      // Fallback: encode the entire secret
      secretKey = btoa(webhookSecret);
      log('info', 'Base64 encoded raw webhook secret');
    }

    log('info', 'Attempting signature verification', { 
      secretPrefix: webhookSecret.substring(0, Math.min(12, webhookSecret.length)) + '...',
      secretKeyLength: secretKey.length,
      payloadLength: payload.length 
    });

    // Initialize Webhook verifier
    let wh: Webhook;
    try {
      wh = new Webhook(secretKey);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log('error', 'Failed to initialize Webhook verifier', { 
        error: errorMsg,
        secretKeyLength: secretKey.length
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
        webhookId,
        signaturePrefix: webhookSignature?.substring(0, 20) + '...'
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
      case 'subscription.active': {
        const subscription = event.data;
        const userId = extractUserId(subscription);
        
        if (!userId) {
          log('error', 'No user_id found in subscription data', { 
            hasCustomer: !!subscription?.customer,
            hasMetadata: !!subscription?.metadata,
            subscriptionId: subscription?.id
          });
          // Return 400 - this is a permanent error, don't retry
          return new Response(JSON.stringify({ 
            error: 'No user_id in subscription', 
            requestId,
            hint: 'Ensure customerExternalId is set during checkout'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        log('info', 'Processing subscription activation', { 
          userId, 
          subscriptionId: subscription?.id,
          status: subscription?.status,
          productId: subscription?.product_id
        });

        // Check if user exists in profiles table - they should be created by auth trigger
        const { data: userProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', userId)
          .maybeSingle();

        if (profileCheckError) {
          log('error', 'Error checking user profile', { error: profileCheckError.message, userId });
          // Return 202 to signal Polar should retry later
          return new Response(JSON.stringify({ 
            received: true, 
            status: 'pending',
            message: 'User profile not ready, will process on retry',
            requestId 
          }), {
            status: 202,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!userProfile) {
          log('warn', 'User profile not found, will retry later', { userId });
          // Return 202 Accepted - Polar should retry this webhook later
          // This handles the race condition where webhook arrives before user signup completes
          return new Response(JSON.stringify({ 
            received: true, 
            status: 'pending',
            message: 'User profile not found, awaiting user signup completion',
            requestId 
          }), {
            status: 202,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        log('info', 'User profile verified', { userId, email: userProfile.email });

        const isTrialing = subscription?.status === 'trialing';
        const accountSlots = getAccountSlotsFromProductId(subscription?.product_id);

        // Check if subscription already exists (idempotency)
        const { data: existingSub, error: existingError } = await supabase
          .from('user_subscriptions')
          .select('id, created_at, polar_subscription_id, status')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingError) {
          log('warn', 'Error checking existing subscription', { error: existingError.message });
        }

        // Skip if we already processed this exact subscription with same status
        const isSameStatus = (existingSub?.status === 'active' && !isTrialing) || 
                             (existingSub?.status === 'trialing' && isTrialing);
        if (existingSub?.polar_subscription_id === subscription?.id && isSameStatus) {
          log('info', 'Subscription already processed (idempotent skip)', { userId, status: existingSub?.status });
          return new Response(JSON.stringify({ received: true, skipped: 'already_processed', requestId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const isNewSubscription = !existingSub;

        // Get user's linked player profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('player_profiles')
          .select('id, player_tag, last_seen_at')
          .eq('user_id', userId)
          .order('last_seen_at', { ascending: false });

        if (profilesError) {
          log('warn', 'Error fetching player profiles', { error: profilesError.message });
        }

        const profileCount = profiles?.length || 0;
        const needsAISelection = profileCount > accountSlots;

        // Auto-enable AI on profiles if user has <= slots
        if (!needsAISelection && profiles && profiles.length > 0) {
          const profilesToEnable = profiles.slice(0, accountSlots);
          for (const profile of profilesToEnable) {
            const { error: enableError } = await supabase
              .from('player_profiles')
              .update({ ai_enabled: true })
              .eq('id', profile.id);
            
            if (enableError) {
              log('warn', 'Error enabling AI on profile', { profileId: profile.id, error: enableError.message });
            }
          }
          log('info', 'Auto-enabled AI on profiles', { count: profilesToEnable.length, userId });
        }

        // Upsert subscription
        const { error: upsertError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            polar_subscription_id: subscription?.id || null,
            polar_customer_id: subscription?.customer?.id || null,
            polar_customer_external_id: userId,
            status: isTrialing ? 'trialing' : 'active',
            variant_id: subscription?.product_id || null,
            current_period_start: subscription?.current_period_start || null,
            current_period_end: subscription?.current_period_end || null,
            account_slots: accountSlots,
            needs_ai_selection: needsAISelection,
            pending_account_slots: null,
            pending_change_effective_at: null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          log('error', 'Error upserting subscription', { error: upsertError.message, userId });
          return new Response(JSON.stringify({ error: 'Database error', requestId }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        log('info', 'Subscription activated', { userId, accountSlots, needsAISelection, isTrialing });

        // Update trial info if trialing
        if (isTrialing) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              trial_started_at: subscription?.current_period_start || new Date().toISOString(),
              trial_ends_at: subscription?.current_period_end || null,
              trial_used: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (profileError) {
            log('warn', 'Error updating profile trial', { error: profileError.message, userId });
          }
        }

        // Send subscription confirmation email for NEW subscriptions only
        if (isNewSubscription && !isTrialing) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, preferred_language')
              .eq('id', userId)
              .single();

            if (profile?.email) {
              log('info', 'Sending subscription email', { email: profile.email });
              
              const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                  email: profile.email,
                  type: 'subscription',
                  language: profile.preferred_language || 'en',
                  subscriptionData: {
                    accountSlots,
                    renewalDate: subscription?.current_period_end,
                  }
                }
              });

              if (emailError) {
                log('warn', 'Failed to send subscription email', { error: emailError.message });
              } else {
                log('info', 'Subscription email sent');
              }
            }
          } catch (emailErr) {
            log('warn', 'Exception sending subscription email', { 
              error: emailErr instanceof Error ? emailErr.message : String(emailErr) 
            });
          }
        }
        // Log successful processing
        await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'processed', undefined, {
          accountSlots,
          needsAISelection,
          isTrialing,
          isNewSubscription
        });
        break;
      }

      case 'subscription.updated': {
        const subscription = event.data;
        const userId = extractUserId(subscription);

        if (!userId) {
          log('error', 'No user_id found in subscription update');
          return new Response(JSON.stringify({ error: 'No user_id in subscription update', requestId }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        log('info', 'Processing subscription update', { userId, status: subscription?.status });
        
        const accountSlots = getAccountSlotsFromProductId(subscription?.product_id);

        // Get current subscription to check for tier changes
        const { data: currentSub } = await supabase
          .from('user_subscriptions')
          .select('account_slots, pending_account_slots')
          .eq('user_id', userId)
          .maybeSingle();

        // Handle tier downgrade
        if (currentSub?.pending_account_slots && currentSub.pending_account_slots !== currentSub.account_slots) {
          const { data: profiles } = await supabase
            .from('player_profiles')
            .select('id, ai_enabled')
            .eq('user_id', userId);

          const enabledCount = profiles?.filter(p => p.ai_enabled).length || 0;

          if (enabledCount > accountSlots) {
            await supabase
              .from('player_profiles')
              .update({ ai_enabled: false })
              .eq('user_id', userId);
            
            await supabase
              .from('user_subscriptions')
              .update({ needs_ai_selection: true })
              .eq('user_id', userId);
            
            log('info', 'Disabled AI due to downgrade', { userId, oldSlots: enabledCount, newSlots: accountSlots });
          }
        }

        // Determine status - handle various Polar status values
        let status = 'active';
        if (subscription?.status === 'trialing') {
          status = 'trialing';
        } else if (subscription?.status === 'canceled' || subscription?.status === 'cancelled') {
          status = 'cancelled';
        } else if (subscription?.status === 'past_due') {
          status = 'past_due';
        }

        // Use UPSERT to handle case where subscription.created wasn't received (common for trials)
        const { error: upsertError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            polar_subscription_id: subscription?.id || null,
            polar_customer_id: subscription?.customer?.id || null,
            polar_customer_external_id: userId,
            status,
            variant_id: subscription?.product_id || null,
            account_slots: accountSlots,
            current_period_start: subscription?.current_period_start,
            current_period_end: subscription?.current_period_end,
            pending_account_slots: null,
            pending_change_effective_at: null,
            needs_ai_selection: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          log('error', 'Error upserting subscription', { error: upsertError.message, userId });
          return new Response(JSON.stringify({ error: 'Database error', requestId }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update profile trial fields for trialing subscriptions
        if (status === 'trialing') {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              trial_started_at: subscription?.current_period_start || new Date().toISOString(),
              trial_ends_at: subscription?.current_period_end || null,
              trial_used: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (profileError) {
            log('warn', 'Error updating profile trial', { error: profileError.message, userId });
          }
        }

        log('info', 'Subscription updated/created', { userId, status, accountSlots });
        
        await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'processed', undefined, {
          status,
          accountSlots
        });
        break;
      }

      case 'subscription.canceled': {
        const subscription = event.data;
        const userId = extractUserId(subscription);

        if (!userId) {
          log('error', 'No user_id found in subscription cancel');
          break;
        }

        log('info', 'Processing subscription cancellation', { userId });

        // Use UPSERT to handle case where no subscription record exists
        const { error: cancelError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            polar_subscription_id: subscription?.id || null,
            polar_customer_id: subscription?.customer?.id || null,
            polar_customer_external_id: userId,
            status: 'cancelled',
            current_period_end: subscription?.current_period_end,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (cancelError) {
          log('error', 'Error cancelling subscription', { error: cancelError.message, userId });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'failed', cancelError.message);
        } else {
          log('info', 'Subscription cancelled (access until period end)', { userId });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'processed');
        }
        break;
      }

      case 'subscription.uncanceled': {
        const subscription = event.data;
        const userId = extractUserId(subscription);

        if (!userId) {
          log('error', 'No user_id found in subscription uncancel');
          break;
        }

        log('info', 'Processing subscription uncancellation', { userId });

        const { error: uncancelError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (uncancelError) {
          log('error', 'Error uncancelling subscription', { error: uncancelError.message });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'failed', uncancelError.message);
        } else {
          log('info', 'Subscription reactivated', { userId });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'processed');
        }
        break;
      }

      case 'subscription.revoked':
      case 'subscription.ended': {
        const subscription = event.data;
        const userId = extractUserId(subscription);

        if (!userId) {
          log('error', `No user_id found in ${event.type}`);
          break;
        }

        log('info', `Processing ${event.type}`, { userId });

        // Disable AI on all profiles
        const { error: disableError } = await supabase
          .from('player_profiles')
          .update({ ai_enabled: false })
          .eq('user_id', userId);

        if (disableError) {
          log('warn', 'Error disabling AI on profiles', { error: disableError.message });
        }

        const { error: revokeError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'expired',
            account_slots: 0,
            needs_ai_selection: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (revokeError) {
          log('error', 'Error revoking subscription', { error: revokeError.message });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'failed', revokeError.message);
        } else {
          log('info', 'Subscription revoked, AI disabled', { userId });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'processed');
          
          // Send trial expired email
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, preferred_language')
              .eq('id', userId)
              .single();

            if (profile?.email) {
              log('info', 'Sending trial expired email', { email: profile.email });
              
              const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                  email: profile.email,
                  type: 'trial_expired',
                  language: profile.preferred_language || 'en',
                }
              });

              if (emailError) {
                log('warn', 'Failed to send trial expired email', { error: emailError.message });
              } else {
                log('info', 'Trial expired email sent');
              }
            }
          } catch (emailErr) {
            log('warn', 'Exception sending trial expired email', { 
              error: emailErr instanceof Error ? emailErr.message : String(emailErr) 
            });
          }
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
        log('info', `Order event: ${event.type}`, { orderId: event.data?.id });
        await logWebhookEvent(supabase, event.type, event.data?.id, null, 'processed', undefined, {
          orderId: event.data?.id
        });
        break;
      }

      case 'subscription.past_due': {
        const subscription = event.data;
        const userId = extractUserId(subscription);

        if (!userId) {
          log('error', 'No user_id found in subscription.past_due');
          break;
        }

        log('warn', 'Subscription past due', { userId, subscriptionId: subscription?.id });

        const { error: pastDueError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (pastDueError) {
          log('error', 'Error updating past_due status', { error: pastDueError.message, userId });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'failed', pastDueError.message);
        } else {
          log('info', 'Subscription marked as past_due', { userId });
          await logWebhookEvent(supabase, event.type, subscription?.id, userId, 'processed');
        }
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
