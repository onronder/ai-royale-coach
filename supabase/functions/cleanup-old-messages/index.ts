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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with their retention preferences
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, chat_retention_days');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    let totalDeleted = 0;
    const results: { userId: string; deleted: number; retentionDays: number | null }[] = [];

    for (const profile of profiles || []) {
      // Skip users who want to keep messages forever (null retention)
      if (profile.chat_retention_days === null) {
        console.log(`User ${profile.id}: retention set to forever, skipping`);
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
        console.error(`Error deleting messages for user ${profile.id}:`, error);
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
        console.log(`User ${profile.id}: deleted ${deletedCount} messages older than ${retentionDays} days`);
      }
    }

    console.log(`Cleanup completed: ${totalDeleted} total messages deleted across ${results.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalDeleted,
        usersProcessed: profiles?.length || 0,
        usersWithDeletions: results.length,
        details: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Cleanup failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
