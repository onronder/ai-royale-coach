import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';

interface AdminActionRequest {
  action: 'clear_signals' | 'set_warning' | 'soft_block' | 'unblock';
  targetUserId: string;
  notes?: string;
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's auth for permission check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized - no auth header', 401);
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      logger.error('Auth error', { error: userError?.message });
      return errorResponse('Unauthorized - invalid token', 401);
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
      logger.error('Role check error', { error: roleError?.message });
      return errorResponse('Forbidden - admin or moderator role required', 403);
    }

    // Parse request body
    const { action, targetUserId, notes }: AdminActionRequest = await req.json();

    if (!action || !targetUserId) {
      return errorResponse('Missing required fields: action, targetUserId', 400);
    }

    logger.info('Admin performing fraud action', { adminId, action, targetUserId });

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
        newFraudScore = currentStatus?.fraud_score || 40;
        break;
      case 'soft_block':
        newStatus = 'soft_blocked';
        newFraudScore = currentStatus?.fraud_score || 70;
        break;
      case 'unblock':
        newStatus = 'clean';
        newFraudScore = 0;
        break;
      default:
        return errorResponse(`Invalid action: ${action}`, 400);
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
      logger.error('Update error', { error: updateError.message });
      return errorResponse('Failed to update fraud status', 500);
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
      logger.warn('Audit log error (non-fatal)', { error: auditError.message });
    }

    logger.info('Successfully updated fraud status', { targetUserId, newStatus });

    return jsonResponse({
      success: true,
      newStatus,
      newFraudScore,
      message: `User status updated to ${newStatus}`,
    });

  } catch (error) {
    logger.error('Admin fraud action error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
  }
});
