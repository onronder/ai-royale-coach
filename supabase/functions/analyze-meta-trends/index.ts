import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";
import { aiPlayerTag, requirePaidPlayerSlot } from "../_shared/paid-player-slot.ts";
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

    const aiAccess = await checkAiAccess(supabase, user.id);
    if (!aiAccess.allowed) {
      return errorResponse('Subscription required for meta analysis', 403, { subscription_required: true });
    }

    // The global catalog has no player input. A tagged request uses the same
    // paid-player entitlement as the other player-scoped entry points.
    const body = await req.text()
      .then(text => text.trim() ? JSON.parse(text) : {})
      .catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse('Invalid request', 400);
    if (Object.prototype.hasOwnProperty.call(body, 'playerTag')) {
      const tag = aiPlayerTag(body.playerTag);
      if (!tag) return errorResponse('A valid player tag is required', 400);
      const slotError = await requirePaidPlayerSlot(supabase, user.id, aiAccess, tag);
      if (slotError) return slotError;
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

    // Catalog coverage is not a measured population trend or historical series.
    const trends = archetypes.map((arch: any) => {
      const relatedTemplates = templates.filter((t: any) => t.archetype === arch.name);
      
      const templateCount = relatedTemplates.length;
      const popularity = relatedTemplates.reduce((sum: number, t: any) => sum + (t.popularity_score || 0), 0) / (relatedTemplates.length || 1);

      return {
        archetype: arch.name,
        template_count: templateCount,
        popularity,
        trend: 'unknown',
        change_7d: null,
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
