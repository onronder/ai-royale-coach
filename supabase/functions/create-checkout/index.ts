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

    const { successUrl, cancelUrl, accountSlots = 1 } = await req.json();
    
    // Validate accountSlots
    const slots = Math.min(Math.max(1, accountSlots), 3); // Clamp between 1-3
    const polarProductId = productIds[slots];
    
    if (!polarProductId) {
      console.error(`No product ID configured for ${slots} slots`);
      return new Response(JSON.stringify({ error: 'Invalid tier selected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Default success URL if not provided
    const finalSuccessUrl = successUrl || `${req.headers.get('origin')}/select-player?subscription=success`;

    console.log(`Creating checkout for user ${user.id} with ${slots} account slots, product: ${polarProductId}`);

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
        allow_discount_codes: true,
      }),
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('Polar API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create checkout' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const checkoutData = await checkoutResponse.json();
    const checkoutUrl = checkoutData.url;

    if (!checkoutUrl) {
      console.error('No checkout URL in response:', checkoutData);
      return new Response(JSON.stringify({ error: 'Invalid checkout response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Polar checkout created for user ${user.id} - ${slots} account tier`);

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
