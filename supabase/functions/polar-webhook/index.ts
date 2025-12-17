import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
};

// Map product IDs to account slots
function getAccountSlotsFromProductId(productId: string): number {
  const productId1 = Deno.env.get('POLAR_PRODUCT_ID_1');
  const productId2 = Deno.env.get('POLAR_PRODUCT_ID_2');
  const productId3 = Deno.env.get('POLAR_PRODUCT_ID_3');
  
  if (productId === productId1) return 1;
  if (productId === productId2) return 2;
  if (productId === productId3) return 3;
  
  console.warn(`Unknown product ID: ${productId}, defaulting to 1 slot`);
  return 1;
}

serve(async (req) => {
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

    const payload = await req.text();
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

    // Strip 'whsec_' prefix if present - standardwebhooks expects raw base64
    const secretKey = webhookSecret.startsWith('whsec_') 
      ? webhookSecret.slice(6) 
      : webhookSecret;
    const wh = new Webhook(secretKey);
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.active': {
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;
        
        if (!userId) {
          console.error('No user_id found in subscription data');
          break;
        }

        console.log(`Processing subscription active for user ${userId}`);

        const isTrialing = subscription.status === 'trialing';
        const accountSlots = getAccountSlotsFromProductId(subscription.product_id);

        // Check if this is a NEW subscription (not a renewal)
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('id, created_at')
          .eq('user_id', userId)
          .single();

        const isNewSubscription = !existingSub;

        // Get user's linked player profiles
        const { data: profiles } = await supabase
          .from('player_profiles')
          .select('id, player_tag, last_seen_at')
          .eq('user_id', userId)
          .order('last_seen_at', { ascending: false });

        const profileCount = profiles?.length || 0;
        
        // Determine if user needs to select which accounts get AI
        // If user has more profiles than slots, they need to choose
        const needsAISelection = profileCount > accountSlots;

        // If user has profiles <= slots, auto-enable AI on all profiles
        if (!needsAISelection && profiles && profiles.length > 0) {
          const profilesToEnable = profiles.slice(0, accountSlots);
          for (const profile of profilesToEnable) {
            await supabase
              .from('player_profiles')
              .update({ ai_enabled: true })
              .eq('id', profile.id);
          }
          console.log(`Auto-enabled AI on ${profilesToEnable.length} profiles for user ${userId}`);
        }

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
            account_slots: accountSlots,
            needs_ai_selection: needsAISelection,
            pending_account_slots: null,
            pending_change_effective_at: null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          console.error('Error upserting subscription:', upsertError);
        } else {
          console.log(`Subscription activated for user ${userId} with ${accountSlots} slots, needs_selection: ${needsAISelection}`);
        }

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

        // Send subscription confirmation email only for NEW subscriptions (not renewals)
        if (isNewSubscription) {
          try {
            // Get user email and preferred language from profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, preferred_language')
              .eq('id', userId)
              .single();

            if (profile?.email) {
              console.log(`Sending subscription email to ${profile.email}`);
              
              const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                  email: profile.email,
                  type: 'subscription',
                  language: profile.preferred_language || 'en',
                  subscriptionData: {
                    accountSlots,
                    renewalDate: subscription.current_period_end,
                  }
                }
              });

              if (emailError) {
                console.error('Failed to send subscription email:', emailError);
              } else {
                console.log('Subscription confirmation email sent successfully');
              }
            } else {
              console.warn('No email found for user, skipping subscription email');
            }
          } catch (emailErr) {
            console.error('Error sending subscription email:', emailErr);
            // Don't fail the webhook for email errors
          }
        }
        break;
      }

      case 'subscription.updated': {
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in subscription update');
          break;
        }

        console.log(`Processing subscription update for user ${userId}`);
        
        const accountSlots = getAccountSlotsFromProductId(subscription.product_id);

        // Get current subscription to check for tier changes
        const { data: currentSub } = await supabase
          .from('user_subscriptions')
          .select('account_slots, pending_account_slots')
          .eq('user_id', userId)
          .single();

        // If tier changed (renewal with pending change), update ai_enabled accordingly
        if (currentSub?.pending_account_slots && currentSub.pending_account_slots !== currentSub.account_slots) {
          const newSlots = accountSlots;
          
          // Get user's profiles
          const { data: profiles } = await supabase
            .from('player_profiles')
            .select('id, ai_enabled')
            .eq('user_id', userId);

          const enabledCount = profiles?.filter(p => p.ai_enabled).length || 0;

          // If downgrading, may need to disable some accounts
          if (enabledCount > newSlots) {
            // Disable excess accounts (user will need to re-select)
            await supabase
              .from('player_profiles')
              .update({ ai_enabled: false })
              .eq('user_id', userId);
            
            // Set needs_ai_selection flag
            await supabase
              .from('user_subscriptions')
              .update({ needs_ai_selection: true })
              .eq('user_id', userId);
          }
        }

        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status === 'trialing' ? 'trialing' : 'active',
            account_slots: accountSlots,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            pending_account_slots: null,
            pending_change_effective_at: null,
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
        const subscription = event.data;
        const userId = subscription.customer?.external_id || subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id found in subscription revoke');
          break;
        }

        console.log(`Processing subscription revocation for user ${userId}`);

        // Disable AI on all profiles
        await supabase
          .from('player_profiles')
          .update({ ai_enabled: false })
          .eq('user_id', userId);

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
          console.error('Error revoking subscription:', revokeError);
        } else {
          console.log(`Subscription revoked for user ${userId}, AI disabled on all profiles`);
        }
        break;
      }

      case 'checkout.created':
      case 'checkout.updated': {
        console.log(`Checkout event: ${event.type}`, event.data?.id);
        break;
      }

      case 'order.created': {
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
