import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with their retention preferences
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, chat_retention_days');

    if (profilesError) {
      logger.error('Error fetching profiles', { error: profilesError.message });
      throw profilesError;
    }

    let totalDeleted = 0;
    const results: { userId: string; deleted: number; retentionDays: number | null }[] = [];

    for (const profile of profiles || []) {
      // Skip users who want to keep messages forever (null retention)
      if (profile.chat_retention_days === null) {
        logger.debug('User retention set to forever, skipping', { userId: profile.id });
        continue;
      }

      const retentionDays = profile.chat_retention_days;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete old messages for this user
      const { data, error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', profile.id)
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        logger.error('Error deleting messages for user', { userId: profile.id, error: error.message });
        continue;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        totalDeleted += deletedCount;
        results.push({
          userId: profile.id,
          deleted: deletedCount,
          retentionDays: retentionDays,
        });
        logger.info('Deleted old messages for user', { userId: profile.id, count: deletedCount, retentionDays });
      }
    }

    logger.info('Cleanup completed', { totalDeleted, usersWithDeletions: results.length });

    return jsonResponse({ 
      success: true, 
      totalDeleted,
      usersProcessed: profiles?.length || 0,
      usersWithDeletions: results.length,
      details: results
    });
  } catch (error) {
    logger.error('Cleanup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
