import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { readPolarMrr } from './metrics.ts';

Deno.serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data, error } = await client.auth.getClaims(auth.slice(7));
    if (error || !data?.claims.sub) return errorResponse('Unauthorized', 401);
    const server = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const allowed = await server.rpc('is_admin', { p_user_id: data.claims.sub });
    if (allowed.error) throw new Error('Admin check unavailable');
    if (allowed.data !== true) return errorResponse('Forbidden', 403);

    const token = Deno.env.get('POLAR_ACCESS_TOKEN');
    if (!token) throw new Error('Missing Polar configuration');
    const products = [1, 2, 3].map(n => Deno.env.get('POLAR_PRODUCT_ID_' + n) ?? '');
    return jsonResponse(await readPolarMrr(token, products));
  } catch (error) {
    console.error('MRR unavailable', error instanceof Error ? error.message : 'unknown error');
    return errorResponse('Polar MRR unavailable', 502);
  }
});
