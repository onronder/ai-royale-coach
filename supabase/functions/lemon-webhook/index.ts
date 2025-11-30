import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

// Verify webhook signature using HMAC
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || '';

    // Verify webhook signature
    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const data = payload.data;
    const customData = payload.meta?.custom_data;

    console.log(`Processing Lemon Squeezy webhook: ${eventName}`);

    // Extract user_id from custom_data (passed during checkout)
    const userId = customData?.user_id;

    if (!userId && eventName !== 'subscription_payment_success') {
      console.error('No user_id in custom_data');
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subscriptionId = data?.id?.toString();
    const attributes = data?.attributes || {};

    switch (eventName) {
      case 'subscription_created': {
        // Determine account slots based on variant
        const variantId = attributes.variant_id?.toString();
        let accountSlots = 1;
        
        // You can map variant IDs to slots here if you have multiple tiers
        // For now, default to 3 slots for any paid subscription
        accountSlots = 3;

        const { error } = await supabase.from('user_subscriptions').upsert({
          user_id: userId,
          lemon_squeezy_subscription_id: subscriptionId,
          lemon_squeezy_customer_id: attributes.customer_id?.toString(),
          status: attributes.status === 'active' ? 'active' : 'inactive',
          variant_id: variantId,
          account_slots: accountSlots,
          current_period_start: attributes.renews_at ? new Date(attributes.created_at).toISOString() : null,
          current_period_end: attributes.renews_at ? new Date(attributes.renews_at).toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'lemon_squeezy_subscription_id' });

        if (error) {
          console.error('Error creating subscription:', error);
          throw error;
        }

        // Mark trial as used since they subscribed
        await supabase.from('profiles').update({
          trial_used: true,
        }).eq('id', userId);

        console.log(`Subscription created for user ${userId}`);
        break;
      }

      case 'subscription_updated': {
        const { error } = await supabase.from('user_subscriptions').update({
          status: attributes.status === 'active' ? 'active' : 
                  attributes.status === 'cancelled' ? 'cancelled' : 
                  attributes.status === 'expired' ? 'expired' : 
                  attributes.status === 'past_due' ? 'past_due' : 'inactive',
          current_period_end: attributes.renews_at ? new Date(attributes.renews_at).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('lemon_squeezy_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }

        console.log(`Subscription updated: ${subscriptionId}`);
        break;
      }

      case 'subscription_cancelled': {
        const { error } = await supabase.from('user_subscriptions').update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        }).eq('lemon_squeezy_subscription_id', subscriptionId);

        if (error) {
          console.error('Error cancelling subscription:', error);
          throw error;
        }

        console.log(`Subscription cancelled: ${subscriptionId}`);
        break;
      }

      case 'subscription_expired': {
        const { error } = await supabase.from('user_subscriptions').update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        }).eq('lemon_squeezy_subscription_id', subscriptionId);

        if (error) {
          console.error('Error expiring subscription:', error);
          throw error;
        }

        console.log(`Subscription expired: ${subscriptionId}`);
        break;
      }

      case 'subscription_payment_failed': {
        const { error } = await supabase.from('user_subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('lemon_squeezy_subscription_id', subscriptionId);

        if (error) {
          console.error('Error marking payment failed:', error);
          throw error;
        }

        console.log(`Payment failed for subscription: ${subscriptionId}`);
        break;
      }

      case 'subscription_payment_recovered': {
        const { error } = await supabase.from('user_subscriptions').update({
          status: 'active',
          updated_at: new Date().toISOString(),
        }).eq('lemon_squeezy_subscription_id', subscriptionId);

        if (error) {
          console.error('Error recovering subscription:', error);
          throw error;
        }

        console.log(`Payment recovered for subscription: ${subscriptionId}`);
        break;
      }

      default:
        console.log(`Unhandled event: ${eventName}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
