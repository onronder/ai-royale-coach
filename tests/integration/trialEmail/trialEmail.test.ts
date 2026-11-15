// Runs the real claim/freeze/begin/release/record SQL functions and queue timer against a throwaway local Postgres,
// with the real reminder/summary sender code and a fake provider. No live data or email is touched.
// Start one with: initdb + pg_ctl on socket dir $TRIAL_EMAIL_PG (see README in this folder).
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sqlStore, type AttemptStore, type Mail, type Provider } from '../../../supabase/functions/_shared/email-attempt';
import { deliverReminder } from '../../../supabase/functions/trial-coaching-reminder/delivery';
import { deliverSummary, type SummaryTask } from '../../../supabase/functions/trial-coaching-summary/summary';

const PG = process.env.TRIAL_EMAIL_PG ?? '';
const migration = process.env.TRIAL_EMAIL_MIGRATION ?? '';
const psql = (sql: string, db = 'trial_email_test') => {
  const r = Bun.spawnSync(['psql', '-h', PG, '-p', '55432', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-Atqc', sql]);
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
};
const lit = (v: unknown) => v === null ? 'NULL' : `'${(typeof v === 'string' ? v : JSON.stringify(v)).replace(/'/g, "''")}'`;
const rpc = async (fn: string, args: Record<string, unknown>) => {
  const out = JSON.parse(psql(`SELECT coalesce(json_agg(r), '[]') FROM public.${fn}(${Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(', ')}) r`));
  return out.length === 1 && Object.keys(out[0]).length === 1 && fn in out[0] ? out[0][fn] : out;
};
const asUser = (uid: string, sql: string) => psql(`SET test.uid = '${uid}'; ${sql}`);
const U = '11111111-1111-4111-8111-111111111111', A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** Fake Resend: honours idempotency (same key+body → same id, same key+other body → 409) and lists accepted mail. */
function fakeProvider() {
  const accepted: { id: string; key: string; mail: Mail; at: number }[] = [];
  let failNext: 'network-before' | null = null;
  const p: Provider & { accepted: typeof accepted; failNextSend(): void } = {
    accepted,
    failNextSend() { failNext = 'network-before'; },
    async send(mail, key) {
      if (failNext) { failNext = null; throw new Error('provider timeout'); }
      const prior = accepted.find(a => a.key === key);
      if (prior) { if (JSON.stringify(prior.mail) !== JSON.stringify(mail)) throw new Error('409 idempotency conflict'); return prior.id; }
      const id = 're_' + (accepted.length + 1); accepted.push({ id, key, mail, at: Date.now() }); return id;
    },
    async findAccepted(mail, since) {
      return accepted.find(a => a.at >= since.getTime() && a.mail.subject === mail.subject && a.mail.to[0] === mail.to[0])?.id ?? null;
    },
  };
  return p;
}
const failRecordOnce = (s: AttemptStore): AttemptStore => {
  let failed = false;
  return { ...s, record: async (...a) => { if (!failed) { failed = true; throw new Error('database write failed'); } return s.record(...a); } };
};
const tick = () => { psql('TRUNCATE net.calls'); psql(`SELECT public.queue_trial_coaching_reminders('https://x.invalid', 'anon')`);
  return psql(`SELECT coalesce(json_agg(json_build_object('fn', split_part(url, '/', 6), 'ticket', body->>'ticket')), '[]') FROM net.calls`); };
const tickets = (fn: string) => (JSON.parse(tick()) as { fn: string; ticket: string }[]).filter(c => c.fn === fn).map(c => c.ticket);
const age = (minutes: number) => psql(`UPDATE trial_coaching_followup SET attempted_at = attempted_at - interval '${minutes} minutes',
  summary_attempted_at = summary_attempted_at - interval '${minutes} minutes',
  reminder_send_started_at = reminder_send_started_at - interval '${minutes} minutes',
  summary_send_started_at = summary_send_started_at - interval '${minutes} minutes'`);
const post = (ticket: string) => new Request('https://w.invalid', { method: 'POST', body: JSON.stringify({ ticket }) });
const row = () => JSON.parse(psql(`SELECT row_to_json(f) FROM trial_coaching_followup f`) || 'null');
const summaryTask = (id: string): SummaryTask => ({ id, language: 'en', source_deck: [], recommended_deck: [], battle_result: null, previous_match: null,
  recommendation: { remove_id: 1, add_id: 2, reason: 'R', practice: 'P', language: 'en', follow_up_language: 'en' },
  follow_up_question: null, follow_up_answer: null } as never);
const reads = { task: async (id: string) => summaryTask(id), translation: async () => undefined };

const ready = (() => { try { return !!PG && !!migration && psql('SELECT 1', 'postgres') === '1'; } catch { return false; } })();

describe('trial emails against the real SQL functions', { skip: !ready && 'set TRIAL_EMAIL_PG and TRIAL_EMAIL_MIGRATION' }, () => {
  const report: Record<string, unknown> = {};
  beforeEach(() => {
    psql('DROP DATABASE IF EXISTS trial_email_test WITH (FORCE)', 'postgres'); psql('CREATE DATABASE trial_email_test', 'postgres');
    for (const f of ['tests/integration/trialEmail/base.sql', migration]) {
      const r = Bun.spawnSync(['psql', '-h', PG, '-p', '55432', '-U', 'postgres', '-d', 'trial_email_test', '-v', 'ON_ERROR_STOP=1', '-q', '-f', f]);
      if (r.exitCode !== 0) throw new Error(r.stderr.toString());
    }
    psql(`INSERT INTO auth.users VALUES ('${U}', 'trial@example.invalid', now());
      INSERT INTO profiles (id) VALUES ('${U}');
      INSERT INTO user_subscriptions (user_id, polar_subscription_id, status, current_period_start, current_period_end)
        VALUES ('${U}', 'sub-1', 'trialing', now() - interval '30 hours', now() + interval '6 hours');
      INSERT INTO player_profiles VALUES ('${U}', '#AAA'), ('${U}', '#BBB');
      INSERT INTO coaching_tasks (id, user_id, player_tag, language, recommendation, shown_at) VALUES
        ('${A}', '${U}', 'AAA', 'en', '{}', now() - interval '2 hours'), ('${B}', '${U}', 'BBB', 'en', '{}', now() - interval '3 hours');`);
  });

  it('reminder: A accepted but not recorded, then player picks B → A id reconciled, B never sent', async () => {
    const p = fakeProvider();
    asUser(U, `SELECT update_trial_coaching('sub-1', 'on', 'AAA')`);
    const [t1] = tickets('trial-coaching-reminder');
    await assert.rejects(deliverReminder(post(t1), failRecordOnce(sqlStore(rpc, 'reminder')), p), /database write failed/);
    asUser(U, `SELECT update_trial_coaching('sub-1', 'off', 'AAA')`);
    psql(`UPDATE coaching_tasks SET shown_at = now() WHERE id = '${B}'`);
    asUser(U, `SELECT update_trial_coaching('sub-1', 'on', 'BBB')`);
    age(20);
    const [t2] = tickets('trial-coaching-reminder');
    await deliverReminder(post(t2), sqlStore(rpc, 'reminder'), p);
    const r = row();
    assert.equal(p.accepted.length, 1);
    assert.match(p.accepted[0].mail.text, /coaching=AAA/);
    assert.equal(r.resend_message_id, 're_1');
    assert.ok(r.sent_at);
    age(20);
    const next = tickets('trial-coaching-reminder');
    assert.deepEqual(next, []);
    report.reminderSwitch = { link: p.accepted[0].mail.text.match(/coaching=\w+/)![0], accepted: p.accepted.length, recorded: r.resend_message_id, nextTick: next.length };
  });

  it('reminder: provider never got A, player picks B → A released, B sent with a new key', async () => {
    const p = fakeProvider();
    asUser(U, `SELECT update_trial_coaching('sub-1', 'on', 'AAA')`);
    p.failNextSend();
    await assert.rejects(deliverReminder(post(tickets('trial-coaching-reminder')[0]), sqlStore(rpc, 'reminder'), p), /timeout/);
    asUser(U, `SELECT update_trial_coaching('sub-1', 'off', 'AAA')`);
    psql(`UPDATE coaching_tasks SET shown_at = now() WHERE id = '${B}'`);
    asUser(U, `SELECT update_trial_coaching('sub-1', 'on', 'BBB')`);
    age(20);
    await deliverReminder(post(tickets('trial-coaching-reminder')[0]), sqlStore(rpc, 'reminder'), p);
    assert.equal(p.accepted.length, 1);
    assert.match(p.accepted[0].mail.text, /coaching=BBB/);
    assert.equal(row().resend_message_id, 're_1');
    age(20);
    assert.deepEqual(tickets('trial-coaching-reminder'), []);
    report.reminderNeverAccepted = { link: 'coaching=BBB', accepted: 1, recorded: 're_1', nextTick: 0 };
  });

  it("reminder: A's match finishes while the email is prepared → nothing sent", async () => {
    const p = fakeProvider();
    asUser(U, `SELECT update_trial_coaching('sub-1', 'on', 'AAA')`);
    const s = sqlStore(rpc, 'reminder');
    const store: AttemptStore = { ...s, freeze: async (...a) => { const f = await s.freeze(...a);
      psql(`UPDATE coaching_tasks SET battle_result = '{"outcome":"win"}' WHERE id = '${A}'`); return f; } };
    await deliverReminder(post(tickets('trial-coaching-reminder')[0]), store, p);
    assert.equal(p.accepted.length, 0);
    assert.equal(row().sent_at, null);
    age(20);
    assert.deepEqual(tickets('trial-coaching-reminder'), []);
    report.reminderMatchFinished = { accepted: 0, recorded: null, nextTick: 0 };
  });

  it('reminder: player turns it off after A may have been accepted → recorded as A, no second email', async () => {
    const p = fakeProvider();
    asUser(U, `SELECT update_trial_coaching('sub-1', 'on', 'AAA')`);
    await assert.rejects(deliverReminder(post(tickets('trial-coaching-reminder')[0]), failRecordOnce(sqlStore(rpc, 'reminder')), p));
    asUser(U, `SELECT update_trial_coaching('sub-1', 'off', 'AAA')`);
    age(20);
    await deliverReminder(post(tickets('trial-coaching-reminder')[0]), sqlStore(rpc, 'reminder'), p);
    assert.equal(p.accepted.length, 1);
    assert.equal(row().resend_message_id, 're_1');
    assert.equal(row().opted_in_at, null);
  });

  it('summary: subscription turns paid while preparing → skipped, nothing recorded', async () => {
    const p = fakeProvider();
    asUser(U, `SELECT update_trial_summary('AAA', '${A}', true)`);
    const s = sqlStore(rpc, 'summary');
    const store: AttemptStore = { ...s, freeze: async (...a) => { const f = await s.freeze(...a);
      psql(`UPDATE user_subscriptions SET status = 'active'`); return f; } };
    await deliverSummary(post(tickets('trial-coaching-summary')[0]), store, p, reads);
    assert.equal(p.accepted.length, 0);
    assert.equal(row().summary_sent_at, null);
    age(20);
    assert.deepEqual(tickets('trial-coaching-summary'), []);
    report.summaryPaid = { accepted: 0, recorded: null, nextTick: 0 };
  });

  it('summary: A accepted but not recorded, then B chosen → A id reconciled, B never sent', async () => {
    const p = fakeProvider();
    asUser(U, `SELECT update_trial_summary('AAA', '${A}', true)`);
    await assert.rejects(deliverSummary(post(tickets('trial-coaching-summary')[0]), failRecordOnce(sqlStore(rpc, 'summary')), p, reads));
    asUser(U, `SELECT update_trial_summary('BBB', '${B}', true)`);
    age(20);
    await deliverSummary(post(tickets('trial-coaching-summary')[0]), sqlStore(rpc, 'summary'), p, reads);
    assert.equal(p.accepted.length, 1);
    assert.match(p.accepted[0].mail.text, /coaching=AAA/);
    assert.equal(row().summary_message_id, 're_1');
    age(20);
    assert.deepEqual(tickets('trial-coaching-summary'), []);
    report.summarySwitch = { link: 'coaching=AAA', accepted: 1, recorded: 're_1', nextTick: 0 };
    console.log('ACCEPTANCE', JSON.stringify(report));
  });
});
