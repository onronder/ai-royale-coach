import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

// Admin-only: pull every order from Polar and store real amounts (idempotent by order id).
Deno.serve(async (req) => {
  const c = handleCors(req);
  if (c) return c;
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims } = await userClient.auth.getClaims(auth.replace('Bearer ', ''));
    const uid = claims?.claims?.sub;
    if (!uid) return errorResponse('Unauthorized', 401);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isAdmin } = await admin.rpc('is_admin', { p_user_id: uid });
    if (isAdmin !== true) return errorResponse('Forbidden', 403);

    const token = Deno.env.get('POLAR_ACCESS_TOKEN');
    if (!token) return errorResponse('Server configuration error', 500);

    let page = 1, saved = 0, zero = 0, positive = 0;
    while (page <= 50) {
      const r = await fetch(`https://api.polar.sh/v1/orders/?limit=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return errorResponse(`Polar error ${r.status}`, 502);
      const body = await r.json();
      const items = body?.items || [];
      if (!items.length) break;
      const rows = items.map((o: any) => {
        const amount = o.total_amount ?? o.net_amount ?? o.amount ?? 0;
        if (amount > 0) positive++; else zero++;
        return {
          order_id: o.id,
          user_id: o.customer?.external_id || null,
          customer_id: o.customer_id || o.customer?.id || null,
          subscription_id: o.subscription_id || null,
          amount,
          currency: o.currency || null,
          billing_reason: o.billing_reason || null,
          status: o.status || (o.paid ? 'paid' : null),
          created_at: o.created_at,
        };
      });
      const { error } = await admin.from('polar_orders').upsert(rows, { onConflict: 'order_id' });
      if (error) return errorResponse(`DB error: ${error.message}`, 500);
      saved += rows.length;
      const max = body?.pagination?.max_page ?? page;
      if (page >= max) break;
      page++;
    }
    return jsonResponse({ saved, zero, positive });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 500);
  }
});
