// One provider message per subscription and email kind, even when the chosen player/task changes mid-flight.
export interface Mail { from: string; to: string[]; subject: string; text: string; tags?: { name: string; value: string }[] }
export interface Claim {
  user_id: string; subscription_id: string; due_task: string | null; player_tag: string | null; language: string | null; email: string | null;
  payload: Mail | null; attempt: string | null; attempt_task: string | null; send_started_at: string | null;
}
export interface AttemptStore {
  claim(ticket: string): Promise<Claim | null>;
  freeze(c: Claim, task: string, mail: Mail): Promise<{ payload: Mail; attempt: string } | null>;
  /** Final gate: same task, consent on, email still due. Marks the attempt as possibly delivered. */
  begin(c: Claim, attempt: string): Promise<boolean>;
  record(c: Claim, attempt: string, messageId: string): Promise<boolean>;
}
export interface Provider {
  send(mail: Mail, key: string): Promise<string>;
  /** A positive match requires the unique delivery tag from the frozen payload. */
  findAccepted(mail: Mail, since: Date): Promise<string | null>;
}
export type Outcome = 'sent' | 'reconciled' | 'pending' | 'skipped';
const SAFE_REPLAY_MS = 23 * 60 * 60 * 1000;
const ATTEMPT_TAG = 'coaching_delivery';
const TICKET = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTicket(v: unknown): v is string { return typeof v === 'string' && TICKET.test(v); }

export async function runAttempt(ticket: string, kind: string, store: AttemptStore, provider: Provider,
  build: (c: Claim) => Promise<Mail | null>, now: () => number = Date.now): Promise<Outcome> {
  const c = await store.claim(ticket);
  if (!c) return 'skipped';
  const key = (attempt: string) => `${kind}/${c.subscription_id}/${attempt}`;
  let attempt = c.attempt;
  let payload = c.payload;
  if (!attempt || !payload) {
    if (!c.due_task) return 'skipped';
    const mail = await build(c);
    if (!mail) return 'skipped';
    // Freeze the tag with the body. Pre-upgrade attempts retain their original bytes.
    const frozen = await store.freeze(c, c.due_task, {
      ...mail, tags: [{ name: ATTEMPT_TAG, value: crypto.randomUUID() }],
    });
    if (!frozen) return 'skipped';
    ({ attempt, payload } = frozen);
  }

  const started = c.send_started_at ? Date.parse(c.send_started_at) : null;
  const elapsed = started === null ? null : now() - started;
  const replaySafe = elapsed === null || (elapsed >= 0 && elapsed < SAFE_REPLAY_MS);
  let messageId: string | null;
  let outcome: Outcome;
  if (c.due_task && (!c.attempt || c.due_task === c.attempt_task) && replaySafe && await store.begin(c, attempt)) {
    messageId = await provider.send(payload, key(attempt));
    outcome = 'sent';
  } else {
    if (started === null) return 'skipped';
    // Missing list entries cannot prove rejection. Leave the attempted choice intact.
    if (!Number.isFinite(started) || !payload.tags?.some(t => t.name === ATTEMPT_TAG)) return 'pending';
    messageId = await provider.findAccepted(payload, new Date(started - 60_000));
    if (!messageId) return 'pending';
    outcome = 'reconciled';
  }
  if (!await store.record(c, attempt, messageId)) throw new Error('Email acceptance was not recorded');
  return outcome;
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
/** Store backed by the claim/freeze/begin/record SQL functions for one email kind. */
export function sqlStore(rpc: Rpc, kind: 'reminder' | 'summary'): AttemptStore {
  const id = (c: Claim) => ({ p_user: c.user_id, p_subscription: c.subscription_id });
  return {
    claim: async ticket => ((await rpc(`claim_${kind}_attempt`, { p_ticket: ticket })) as Claim[] | null)?.[0] ?? null,
    freeze: async (c, task, mail) => ((await rpc(`freeze_${kind}_attempt`, { ...id(c), p_task: task, p_payload: mail })) as { payload: Mail; attempt: string }[] | null)?.[0] ?? null,
    begin: async (c, attempt) => (await rpc(`begin_${kind}_send`, { ...id(c), p_attempt: attempt })) === true,
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
      const tag = mail.tags?.find(t => t.name === ATTEMPT_TAG);
      if (!tag?.value) return null;
      let after = '';
      for (let page = 0; page < 5; page++) {
        const r = await fetcher('https://api.resend.com/emails?limit=100' + (after ? '&after=' + after : ''), { headers, signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error('Could not list sent emails');
        const body = await r.json() as { data: { id: string; to: string[]; subject: string; created_at: string }[]; has_more: boolean };
        for (const e of body.data) {
          const timestamp = Date.parse(e.created_at.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
          if (!Number.isFinite(timestamp) || timestamp < since.getTime()) continue;
          if (e.subject !== mail.subject || !e.to.some(to => to.toLowerCase() === mail.to[0].toLowerCase())) continue;
          const detail = await fetcher('https://api.resend.com/emails/' + encodeURIComponent(e.id), { headers, signal: AbortSignal.timeout(10000) });
          if (!detail.ok) throw new Error('Could not confirm email identity');
          const message = await detail.json() as { id: string; tags?: { name: string; value: string }[] };
          if (message.id === e.id && message.tags?.some(t => t.name === tag.name && t.value === tag.value)) return e.id;
        }
        if (!body.has_more || !body.data.length) return null;
        after = body.data[body.data.length - 1].id;
      }
      throw new Error('Sent email list too long to reconcile');
    },
  };
}
