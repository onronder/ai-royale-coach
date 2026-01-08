import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminActionRequest {
  action: 'clear_signals' | 'set_warning' | 'soft_block' | 'unblock';
  targetUserId: string;
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's auth for permission check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - no auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminId = user.id;

    // Verify admin role server-side using has_admin_role RPC
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin.rpc('has_admin_role', {
      p_user_id: adminId,
      p_role: 'admin',
    });

    // Also check for moderator role
    const { data: hasModeratorRole } = await supabaseAdmin.rpc('has_admin_role', {
      p_user_id: adminId,
      p_role: 'moderator',
    });

    if (roleError || (!hasAdminRole && !hasModeratorRole)) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - admin or moderator role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { action, targetUserId, notes }: AdminActionRequest = await req.json();

    if (!action || !targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, targetUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${adminId} performing ${action} on user ${targetUserId}`);

    // Fetch current status for audit log
    const { data: currentStatus } = await supabaseAdmin
      .from('user_fraud_status')
      .select('status, fraud_score')
      .eq('user_id', targetUserId)
      .maybeSingle();

    // Perform the action
    let newStatus: string;
    let newFraudScore: number;

    switch (action) {
      case 'clear_signals':
        newStatus = 'clean';
        newFraudScore = 0;
        break;
      case 'set_warning':
        newStatus = 'warning';
        newFraudScore = currentStatus?.fraud_score || 40; // Keep existing or set baseline
        break;
      case 'soft_block':
        newStatus = 'soft_blocked';
        newFraudScore = currentStatus?.fraud_score || 70; // Keep existing or set baseline
        break;
      case 'unblock':
        newStatus = 'clean';
        newFraudScore = 0;
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Invalid action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Upsert the fraud status
    const { error: updateError } = await supabaseAdmin
      .from('user_fraud_status')
      .upsert({
        user_id: targetUserId,
        status: newStatus,
        fraud_score: newFraudScore,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update fraud status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the admin action to audit log
    const { error: auditError } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action: action,
        target_user_id: targetUserId,
        details: {
          previous_status: currentStatus?.status || null,
          new_status: newStatus,
          previous_score: currentStatus?.fraud_score || null,
          new_score: newFraudScore,
          notes: notes || null,
        },
      });

    if (auditError) {
      console.error('Audit log error (non-fatal):', auditError);
      // Don't fail the request for audit log errors
    }

    console.log(`Successfully updated user ${targetUserId} to ${newStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        newStatus,
        newFraudScore,
        message: `User status updated to ${newStatus}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin fraud action error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
