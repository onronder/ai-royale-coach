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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { enabledProfileIds } = await req.json();
    
    if (!Array.isArray(enabledProfileIds)) {
      return new Response(JSON.stringify({ error: 'enabledProfileIds must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check subscription is active
    if (!['active', 'trialing', 'cancelled'].includes(subscription.status)) {
      return new Response(JSON.stringify({ error: 'Subscription not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate selection count against account_slots
    if (enabledProfileIds.length > subscription.account_slots) {
      return new Response(JSON.stringify({ 
        error: `Cannot enable AI on more than ${subscription.account_slots} accounts`,
        maxSlots: subscription.account_slots 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's profiles to verify ownership
    const { data: profiles, error: profilesError } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('user_id', user.id);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userProfileIds = profiles?.map(p => p.id) || [];
    
    // Verify all provided profile IDs belong to user
    const invalidIds = enabledProfileIds.filter(id => !userProfileIds.includes(id));
    if (invalidIds.length > 0) {
      return new Response(JSON.stringify({ error: 'Invalid profile IDs provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disable AI on all user's profiles first
    const { error: disableError } = await supabase
      .from('player_profiles')
      .update({ ai_enabled: false })
      .eq('user_id', user.id);

    if (disableError) {
      console.error('Error disabling AI:', disableError);
      return new Response(JSON.stringify({ error: 'Failed to update profiles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enable AI on selected profiles
    if (enabledProfileIds.length > 0) {
      const { error: enableError } = await supabase
        .from('player_profiles')
        .update({ ai_enabled: true })
        .in('id', enabledProfileIds);

      if (enableError) {
        console.error('Error enabling AI:', enableError);
        return new Response(JSON.stringify({ error: 'Failed to enable AI on profiles' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Clear the needs_ai_selection flag
    await supabase
      .from('user_subscriptions')
      .update({ needs_ai_selection: false })
      .eq('user_id', user.id);

    console.log(`User ${user.id} updated AI access: enabled on ${enabledProfileIds.length} profiles`);

    return new Response(JSON.stringify({ 
      success: true,
      enabledCount: enabledProfileIds.length,
      maxSlots: subscription.account_slots
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Manage AI accounts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
