// Promotional sends: one provider message per campaign and recipient, and nothing leaves unless the SQL gate
// (consent, suppression, market rule, IYS, campaign switch) allows it at the moment of sending.
export interface PromoMail { from: string; to: string[]; subject: string; html: string; headers?: Record<string, string>; tags?: { name: string; value: string }[] }
export type PromoClaim =
  | { action: 'done'; messageId: string }
  | { action: 'blocked'; reason: string }
  | { action: 'unresolved' }
  | { action: 'send'; key: string; payload: PromoMail; email: string };
export interface PromoStore {
  claim(campaign: string, userId: string, payload: PromoMail): Promise<PromoClaim>;
  record(campaign: string, userId: string, key: string, messageId: string, acceptedAt?: string | null): Promise<boolean>;
  uncertain(campaign: string, userId: string, key: string): Promise<void>;
}
export interface PromoProvider {
  send(mail: PromoMail, idempotencyKey: string): Promise<string>;
  /** Provider's own first-acceptance time for a message id (ISO), or null when it cannot be confirmed. */
  acceptedAt?(messageId: string): Promise<string | null>;
}
export type PromoResult =
  | { status: 'sent'; messageId: string; repeat: boolean }
  | { status: 'blocked'; reason: string }
  | { status: 'uncertain' };

export interface PromoRequest { callerIsAdmin: boolean; campaignKey: string; userId: string }
const CAMPAIGN = /^[a-z0-9_:-]{3,80}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deliverPromo(req: PromoRequest, store: PromoStore, provider: PromoProvider,
  build: () => Promise<PromoMail> | PromoMail): Promise<PromoResult> {
  if (!req.callerIsAdmin) return { status: 'blocked', reason: 'not_authorized' };
  if (!CAMPAIGN.test(req.campaignKey) || !UUID.test(req.userId)) return { status: 'blocked', reason: 'invalid_request' };
  // The recipient is never taken from the caller: the gate returns the account's current verified address.
  const draft = { ...(await build()), to: [] };
  let claim: PromoClaim;
  try { claim = await store.claim(req.campaignKey, req.userId, draft); }
  catch { return { status: 'blocked', reason: 'gate_unavailable' }; }
  if (claim.action === 'done') return { status: 'sent', messageId: claim.messageId, repeat: true };
  if (claim.action === 'blocked') return { status: 'blocked', reason: claim.reason };
  // A previous attempt may have been accepted and can no longer be replayed safely: never send again, report it as uncertain.
  if (claim.action === 'unresolved') return { status: 'uncertain' };
  const frozen: PromoMail = { ...claim.payload, to: [claim.email] };
  let id: string;
  try { id = await provider.send(frozen, `promo/${claim.key}`); }
  catch { await store.uncertain(req.campaignKey, req.userId, claim.key).catch(() => {}); return { status: 'uncertain' }; }
  // Only a confirmed local record counts as sent; anything else leaves the outcome uncertain for the admin.
  let acceptedAt: string | null = null;
  try { acceptedAt = provider.acceptedAt ? await provider.acceptedAt(id) : null; } catch { acceptedAt = null; }
  let recorded = false;
  try { recorded = await store.record(req.campaignKey, req.userId, claim.key, id, acceptedAt); } catch { recorded = false; }
  if (!recorded) { await store.uncertain(req.campaignKey, req.userId, claim.key).catch(() => {}); return { status: 'uncertain' }; }
  return { status: 'sent', messageId: id, repeat: false };
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
export function sqlPromoStore(rpc: Rpc): PromoStore {
  return {
    async claim(campaign, userId, payload) {
      const r = await rpc('claim_marketing_delivery', { p_campaign: campaign, p_user: userId, p_payload: payload }) as Record<string, unknown>;
      if (!r || typeof r !== 'object') throw new Error('gate returned nothing');
      if (r.action === 'done') return { action: 'done', messageId: String(r.messageId) };
      if (r.action === 'unresolved') return { action: 'unresolved' };
      if (r.action === 'send') return { action: 'send', key: String(r.key), payload: r.payload as PromoMail, email: String(r.email) };
      return { action: 'blocked', reason: String(r.reason ?? 'unknown') };
    },
    async record(campaign, userId, key, messageId, acceptedAt) {
      return Boolean(await rpc('record_marketing_delivery_at', { p_campaign: campaign, p_user: userId, p_key: key, p_message_id: messageId, p_accepted_at: acceptedAt ?? null }));
    },
    async uncertain(campaign, userId, key) { await rpc('mark_marketing_delivery_uncertain', { p_campaign: campaign, p_user: userId, p_key: key }); },
  };
}

// Win-back sends: every campaign code lives under the `winback:` namespace so the server-side account cooldown
// (claim_winback_delivery) sees all of them, and the claim always goes through that cooldown/segment gate.
export function winbackCampaignKey(code: string, requested?: string | null): string {
  return requested && /^winback:[a-z0-9_:-]{1,72}$/i.test(requested) ? requested : `winback:${code}`;
}
export function winbackRpc(rpc: Rpc): Rpc {
  return (fn, args) => rpc(fn === 'claim_marketing_delivery' ? 'claim_winback_delivery' : fn, args);
}
