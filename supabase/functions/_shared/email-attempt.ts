// One provider message per subscription and email kind, even when the chosen player/task changes mid-flight.
export interface Mail { from: string; to: string[]; subject: string; text: string }
export interface Claim {
  user_id: string; subscription_id: string; due_task: string | null; player_tag: string | null; language: string | null; email: string | null;
  payload: Mail | null; attempt: string | null; attempt_task: string | null; send_started_at: string | null;
}
export interface AttemptStore {
  claim(ticket: string): Promise<Claim | null>;
  freeze(c: Claim, task: string, mail: Mail): Promise<{ payload: Mail; attempt: string } | null>;
  /** Final gate: same task, consent on, email still due. Marks the attempt as possibly delivered. */
  begin(c: Claim, attempt: string): Promise<boolean>;
  release(c: Claim, attempt: string): Promise<void>;
  record(c: Claim, attempt: string, messageId: string): Promise<boolean>;
}
export interface Provider {
  send(mail: Mail, key: string): Promise<string>;
  /** Id of a message the provider already accepted for this exact recipient and subject since `since`, if any. */
  findAccepted(mail: Mail, since: Date): Promise<string | null>;
}
export type Outcome = 'sent' | 'reconciled' | 'released' | 'skipped';
export const RECONCILE_AFTER_MS = 5 * 60 * 1000;
const TICKET = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTicket(v: unknown): v is string { return typeof v === 'string' && TICKET.test(v); }

export async function runAttempt(ticket: string, kind: string, store: AttemptStore, provider: Provider,
  build: (c: Claim) => Promise<Mail | null>, now: () => number = Date.now): Promise<Outcome> {
  const c = await store.claim(ticket);
  if (!c) return 'skipped';
  const key = (attempt: string) => `${kind}/${c.subscription_id}/${attempt}`;
  if (c.attempt && c.payload) {
    if (c.due_task && c.due_task === c.attempt_task && await store.begin(c, c.attempt)) {
      // Same task still due: the same key and frozen body make the provider return the original id.
      await store.record(c, c.attempt, await provider.send(c.payload, key(c.attempt)));
      return 'sent';
    }
    if (c.send_started_at) {
      const started = Date.parse(c.send_started_at);
      const id = await provider.findAccepted(c.payload, new Date(started - 60_000));
      if (id) { await store.record(c, c.attempt, id); return 'reconciled'; }
      if (now() - started < RECONCILE_AFTER_MS) throw new Error('Earlier attempt not reconciled yet');
    }
    await store.release(c, c.attempt);
    if (!c.due_task) return 'released';
  }
  if (!c.due_task) return 'skipped';
  const mail = await build(c);
  if (!mail) return 'skipped';
  const frozen = await store.freeze(c, c.due_task, mail);
  if (!frozen) return 'skipped';
  if (!await store.begin(c, frozen.attempt)) { await store.release(c, frozen.attempt); return 'skipped'; }
  await store.record(c, frozen.attempt, await provider.send(frozen.payload, key(frozen.attempt)));
  return 'sent';
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
/** Store backed by the claim/freeze/begin/release/record SQL functions for one email kind. */
export function sqlStore(rpc: Rpc, kind: 'reminder' | 'summary'): AttemptStore {
  const id = (c: Claim) => ({ p_user: c.user_id, p_subscription: c.subscription_id });
  return {
    claim: async ticket => ((await rpc(`claim_${kind}_attempt`, { p_ticket: ticket })) as Claim[] | null)?.[0] ?? null,
    freeze: async (c, task, mail) => ((await rpc(`freeze_${kind}_attempt`, { ...id(c), p_task: task, p_payload: mail })) as { payload: Mail; attempt: string }[] | null)?.[0] ?? null,
    begin: async (c, attempt) => (await rpc(`begin_${kind}_send`, { ...id(c), p_attempt: attempt })) === true,
    release: async (c, attempt) => { await rpc(`release_${kind}_attempt`, { ...id(c), p_attempt: attempt }); },
    record: async (c, attempt, messageId) => (await rpc(`record_${kind}_send`, { ...id(c), p_attempt: attempt, p_message: messageId })) === true,
  };
}

export function resendProvider(apiKey: string, fetcher: typeof fetch = fetch): Provider {
  const headers = { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
  return {
    async send(mail, key) {
      const r = await fetcher('https://api.resend.com/emails', { method: 'POST', headers: { ...headers, 'Idempotency-Key': key },
        body: JSON.stringify(mail), signal: AbortSignal.timeout(10000) });
      const id = r.ok ? (await r.json()).id : null;
      if (typeof id !== 'string' || !id) throw new Error('Email delivery was not accepted');
      return id;
    },
    async findAccepted(mail, since) {
      let after = '';
      for (let page = 0; page < 5; page++) {
        const r = await fetcher('https://api.resend.com/emails?limit=100' + (after ? '&after=' + after : ''), { headers, signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error('Could not list sent emails');
        const body = await r.json() as { data: { id: string; to: string[]; subject: string; created_at: string }[]; has_more: boolean };
        for (const e of body.data) {
          if (Date.parse(e.created_at.replace(' ', 'T')) < since.getTime()) return null;
          if (e.subject === mail.subject && e.to.map(t => t.toLowerCase()).includes(mail.to[0].toLowerCase())) return e.id;
        }
        if (!body.has_more || !body.data.length) return null;
        after = body.data[body.data.length - 1].id;
      }
      throw new Error('Sent email list too long to reconcile');
    },
  };
}
