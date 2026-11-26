import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { reconcilePage } from './reconcile.ts';
import { runPolarOperation, type PolarOperation } from './operations.ts';

Deno.serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const raw = await req.text();
    let ticket: unknown;
    let operationsTicket: unknown;
    try {
      const input = raw ? JSON.parse(raw) : {};
      ticket = input?.ticket;
      operationsTicket = input?.operations_ticket;
    } catch {
      return errorResponse('Invalid request body', 400);
    }
    if (operationsTicket != null) {
      if (ticket != null || typeof operationsTicket !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(operationsTicket)) {
        return errorResponse('Forbidden', 403);
      }
      const claim = await admin.rpc('claim_polar_operation', { p_ticket: operationsTicket }).maybeSingle();
      if (claim.error) throw claim.error;
      if (!claim.data) return errorResponse('Forbidden', 403);
      const result = await runPolarOperation(claim.data as PolarOperation, name => Deno.env.get(name), fetch);
      const finish = await admin.rpc('finish_polar_operation', { p_ticket: operationsTicket, p_result: result });
      if (finish.error || !finish.data) throw new Error('Polar operation acknowledgement failed');
      return jsonResponse({ completed: true });
    }
    let page = 1;
    if (ticket != null) {
      if (typeof ticket !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(ticket)) return errorResponse('Forbidden', 403);
      const claim = await admin.rpc('claim_polar_order_sync', { p_ticket: ticket });
      if (claim.error) throw claim.error;
      if (!claim.data) return errorResponse('Forbidden', 403);
      page = claim.data;
    } else {
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
      const { data, error } = await client.auth.getClaims(auth.slice(7));
      if (error || !data?.claims.sub) return errorResponse('Unauthorized', 401);
      const allowed = await admin.rpc('is_admin', { p_user_id: data.claims.sub });
      if (allowed.data !== true) return errorResponse('Forbidden', 403);
    }

    const token = Deno.env.get('POLAR_ACCESS_TOKEN');
    if (!token) throw new Error('Polar token missing');
    const products = [1, 2, 3].map(n => Deno.env.get('POLAR_PRODUCT_ID_' + n));
    if (!products.every((id): id is string => Boolean(id))) throw new Error('AI Royale product configuration incomplete');
    const get = async <T>(path: string, params: URLSearchParams) => {
      const response = await fetch('https://api.polar.sh/v1/' + path + '/?' + params, {
        headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Polar ' + path + ' returned ' + response.status);
      const body = await response.json();
      if (!Array.isArray(body.items) || !Number.isInteger(body.pagination?.max_page)) throw new Error('Invalid Polar page');
      return body as { items: T[]; pagination: { max_page: number } };
    };
    const totals = { saved: 0, zero: 0, positive: 0, dated: 0, missing: 0 };
    while (true) {
      const result = await reconcilePage(get, {
        async saveOrders(rows) {
          const { error } = await admin.from('polar_orders').upsert(rows, { onConflict: 'order_id' });
          if (error) throw error;
        },
        async missingDates(ids) {
          const { data, error } = await admin.from('polar_orders').select('order_id').in('order_id', ids).is('paid_at', null);
          if (error) throw error;
          return new Set((data ?? []).map(row => String(row.order_id)));
        },
        async saveDates(dates) {
          const { data, error } = await admin.rpc('record_polar_payment_dates', { p_dates: dates });
          if (error) throw error;
          return Number(data);
        },
      }, products, page);
      for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += result[key];
      if (ticket) {
        const finished = await admin.rpc('finish_polar_order_sync', { p_ticket: ticket, p_more: result.more });
        if (finished.error || finished.data !== true) throw new Error('Scheduled page was not committed');
        break;
      }
      if (!result.more) break;
      page++;
    }
    return jsonResponse(totals);
  } catch (error) {
    console.error('Polar order reconciliation failed', error instanceof Error ? error.message : 'database request failed');
    return errorResponse('Polar order reconciliation failed', 502);
  }
});
