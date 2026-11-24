import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return errorResponse('Unauthorized', 401);

  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return errorResponse('Unauthorized', 401);

    const body = await req.json().catch(() => null);
    const ids = body?.enabledProfileIds;
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
      return errorResponse('enabledProfileIds must be an array of profile IDs', 400);
    }
    const { data, error } = await db.rpc('select_my_ai_profiles', { p_ids: ids });
    if (!error) return jsonResponse(data);
    if (error.code === '22023' || error.code === '22P02') {
      const maxSlots = /^\d+$/.test(error.details ?? '') ? Number(error.details) : undefined;
      return errorResponse(error.code === '22023' ? error.message : 'Invalid profile IDs', 400, { maxSlots });
    }
    if (error.code === '42501') return errorResponse('Access denied', 403);
    logger.error('AI profile selection failed', { code: error.code });
  } catch (error) {
    logger.error('AI profile selection failed', { error: error instanceof Error ? error.name : 'Unknown error' });
  }
  return errorResponse('Failed to update profiles', 500);
});
