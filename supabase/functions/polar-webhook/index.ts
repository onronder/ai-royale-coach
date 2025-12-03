import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!webhookSecret) {
      console.error('POLAR_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get raw body for signature verification
    const payload = await req.text();
    
    // Get webhook headers for verification
    const webhookId = req.headers.get('webhook-id');
    const webhookTimestamp = req.headers.get('webhook-timestamp');
    const webhookSignature = req.headers.get('webhook-signature');

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      console.error('Missing webhook headers');
      return new Response(JSON.stringify({ error: 'Missing webhook headers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify webhook signature using Standard Webhooks
    const wh = new Webhook(webhookSecret);
    let event;
    
    try {
      event = wh.verify(payload, {
        'webhook-id': webhookId,
        'webhook-timestamp': webhookTimestamp,
        'webhook-signature': webhookSignature,
      }) as { type: string; data: any };
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Polar webhook received:', event.type);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.active': {
        // Subscription created or became active (including trial start)
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;
        
        if (!userId) {
          console.error('No user_id found in subscription data');
          break;
        }

        console.log(`Processing subscription active for user ${userId}`);

        // Determine if this is a trial
        const isTrialing = subscription.status === 'trialing';

        const { error: upsertError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            polar_subscription_id: subscription.id,
            polar_customer_id: subscription.customer?.id,
            polar_customer_external_id: userId,
            status: isTrialing ? 'trialing' : 'active',
            variant_id: subscription.product_id,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            account_slots: 3, // Pro users get 3 account slots
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          console.error('Error upserting subscription:', upsertError);
        } else {
          console.log(`Subscription activated for user ${userId}`);
        }

        // Update profiles table for trial tracking if trialing
        if (isTrialing) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              trial_started_at: subscription.current_period_start,
              trial_ends_at: subscription.current_period_end,
              trial_used: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (profileError) {
            console.error('Error updating profile trial:', profileError);
          }
        }
        break;
      }

      case 'subscription.updated': {
        // Subscription was updated (renewal, plan change, etc.)
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in subscription update');
          break;
        }

        console.log(`Processing subscription update for user ${userId}`);

        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status === 'trialing' ? 'trialing' : 'active',
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        } else {
          console.log(`Subscription renewed/updated for user ${userId}`);
        }
        break;
      }

      case 'subscription.canceled': {
        // User cancelled but still has access until period end
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in subscription cancel');
          break;
        }

        console.log(`Processing subscription cancellation for user ${userId}`);

        const { error: cancelError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (cancelError) {
          console.error('Error cancelling subscription:', cancelError);
        } else {
          console.log(`Subscription cancelled for user ${userId} (access until period end)`);
        }
        break;
      }

      case 'subscription.uncanceled': {
        // User re-subscribed before period ended
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in subscription uncancel');
          break;
        }

        console.log(`Processing subscription uncancellation for user ${userId}`);

        const { error: uncancelError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (uncancelError) {
          console.error('Error uncancelling subscription:', uncancelError);
        } else {
          console.log(`Subscription reactivated for user ${userId}`);
        }
        break;
      }

      case 'subscription.revoked': {
        // Access removed - payment failed or cancelled period ended
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in subscription revoke');
          break;
        }

        console.log(`Processing subscription revocation for user ${userId}`);

        const { error: revokeError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'expired',
            account_slots: 1, // Reset to free tier
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (revokeError) {
          console.error('Error revoking subscription:', revokeError);
        } else {
          console.log(`Subscription revoked for user ${userId}`);
        }
        break;
      }

      case 'checkout.created':
      case 'checkout.updated': {
        // Checkout session events - log for debugging
        console.log(`Checkout event: ${event.type}`, event.data?.id);
        break;
      }

      case 'order.created': {
        // Order created - can be used for one-time purchases
        console.log('Order created:', event.data?.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Polar webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
