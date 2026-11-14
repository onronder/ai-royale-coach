import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

// Turns auto-renewal off (action "cancel") or back on (action "resume").
// Uses Polar's period-end cancellation so the user keeps access (and pays nothing
// further) until current_period_end. Never revokes access immediately.
Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) return errorResponse('Unauthorized', 401);
    const userId = claimsData.claims.sub;

    let action: 'cancel' | 'resume' = 'cancel';
    try {
      const body = await req.json();
      if (body?.action === 'resume') action = 'resume';
      else if (body?.action && body.action !== 'cancel') return errorResponse('Invalid action', 400);
    } catch { /* empty body = cancel */ }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: sub } = await admin
      .from('user_subscriptions')
      .select('polar_subscription_id, status, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (!sub) return errorResponse('No subscription found', 404);
    if (!sub.polar_subscription_id) return errorResponse('No Polar subscription ID found', 400);
    const live = ['active', 'trialing', 'past_due'].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    if (!live) return errorResponse('Subscription has already ended', 400);
    if (action === 'cancel' && sub.cancel_at_period_end) return errorResponse('Renewal is already turned off', 400);
    if (action === 'resume' && !sub.cancel_at_period_end) return errorResponse('Renewal is already on', 400);

    const token = Deno.env.get('POLAR_ACCESS_TOKEN');
    if (!token) return errorResponse('Server configuration error', 500);

    const polarRes = await fetch(`https://api.polar.sh/v1/subscriptions/${sub.polar_subscription_id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_at_period_end: action === 'cancel' }),
    });
    if (!polarRes.ok) {
      console.error('Polar API error:', polarRes.status, await polarRes.text());
      return errorResponse('Failed to update subscription with payment provider', 502);
    }
    const polarSub = await polarRes.json().catch(() => null);
    const endsAt = polarSub?.ends_at || polarSub?.current_period_end || sub.current_period_end;

    // Reflect immediately; the webhook will confirm. Status (trialing/active) is kept.
    await admin.from('user_subscriptions').update({
      cancel_at_period_end: action === 'cancel',
      canceled_at: action === 'cancel' ? new Date().toISOString() : null,
      ends_at: action === 'cancel' ? endsAt : null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    if (action === 'cancel') {
      try {
        const { data: profile } = await admin.from('profiles').select('email, preferred_language').eq('id', userId).single();
        if (profile?.email) {
          await admin.functions.invoke('send-email', {
            body: {
              email: profile.email,
              type: 'subscription_cancelled',
              language: profile.preferred_language || 'en',
              accessEndDate: endsAt,
              wasTrial: sub.status === 'trialing',
            },
          });
        }
      } catch (e) {
        console.warn('Cancellation email failed:', e instanceof Error ? e.message : String(e));
      }
    }

    return jsonResponse({ success: true, action, accessEndsAt: endsAt });
  } catch (err) {
    console.error('cancel-subscription error:', err instanceof Error ? err.message : String(err));
    return errorResponse('Internal server error', 500);
  }
});
