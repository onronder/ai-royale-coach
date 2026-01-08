import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized - missing authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return errorResponse('Unauthorized - invalid token', 401);
    }

    // Check subscription status
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, trial_used')
      .eq('id', user.id)
      .single();

    const now = new Date();
    const isTrialActive = profile?.trial_ends_at && 
      new Date(profile.trial_ends_at) > now;
    const hasAccess = subscription?.status === 'active' || isTrialActive;

    if (!hasAccess) {
      return errorResponse('Subscription required for meta analysis', 403, { subscription_required: true });
    }

    // PER-PLAYER AI ACCESS CHECK
    const requestBody = await req.json().catch(() => ({}));
    const { playerTag } = requestBody;
    
    if (playerTag && !isTrialActive) {
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('ai_enabled')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .single();

      if (!playerProfile?.ai_enabled) {
        return errorResponse('AI not enabled for this account', 403, { ai_not_enabled: true, player_tag: playerTag });
      }
    }

    // Fetch deck archetypes from database
    const { data: archetypes, error: dbError } = await supabase
      .from('deck_archetypes')
      .select('*');

    if (dbError) throw dbError;

    // Fetch deck templates for usage/win rate data
    const { data: templates, error: templatesError } = await supabase
      .from('deck_templates')
      .select('*');

    if (templatesError) throw templatesError;

    // Calculate real trends from actual data
    const trends = archetypes.map((arch: any) => {
      const relatedTemplates = templates.filter((t: any) => t.archetype === arch.name);
      
      const templateCount = relatedTemplates.length;
      const popularity = relatedTemplates.reduce((sum: number, t: any) => sum + (t.popularity_score || 0), 0) / (relatedTemplates.length || 1);

      return {
        archetype: arch.name,
        template_count: templateCount,
        popularity,
        trend: 'stable',
        change_7d: 0,
        note: 'Historical trend data not available - requires time-series snapshots'
      };
    });

    // Sort by popularity
    trends.sort((a: any, b: any) => b.popularity - a.popularity);

    return jsonResponse({ trends });
  } catch (error) {
    logger.error('Error in analyze-meta-trends', { error: error instanceof Error ? error.message : 'Unknown error' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
