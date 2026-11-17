import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const socket = process.env.CONVERSION_PG;
assert(socket?.startsWith('/'), 'Set CONVERSION_PG to an isolated PostgreSQL socket directory');
const opts = { host: socket, port: Number(process.env.CONVERSION_PG_PORT ?? 55483), user: 'postgres', max: 1 };
const root = postgres({ ...opts, database: 'postgres' });
const database = 'conversion_test_' + process.pid;
const load = path => readFile(new URL(path, import.meta.url), 'utf8');
try {
  assert.equal((await root`show listen_addresses`)[0].listen_addresses, '');
  await root.unsafe('CREATE DATABASE ' + database);
  const sql = postgres({ ...opts, database });
  try {
    await sql.unsafe(await load('../marketing/base.sql'));
    await sql.unsafe(await load('fixture.sql'));
    for (const migration of ['0020_marketing_consent','0021_marketing_collection_rules_and_provider_blocks',
      '0022_marketing_market_scope_and_unresolved_sends','0023_marketing_hidden_box_and_single_invite_claim','0024_trial_conversion']) {
      await sql.unsafe(await load('../../../drizzle/migrations/' + migration + '.sql'));
    }
    await sql.unsafe(await load('acceptance.sql'));
    const tabs = [postgres({ ...opts, database }), postgres({ ...opts, database })];
    try {
      const assign = tab => tab.begin(async tx => {
        await tx.unsafe("SET LOCAL test.uid='00000000-0000-0000-0000-000000000003'");
        await tx.unsafe('SET LOCAL ROLE authenticated');
        return (await tx`SELECT public.my_return_experiment() AS result`)[0].result;
      });
      const [a,b] = await Promise.all(tabs.map(assign));
      assert.ok(a && a.arm === b.arm && a.key === b.key);
      assert.equal(Number((await sql`SELECT count(*) AS n FROM return_experiment_accounts WHERE user_id='00000000-0000-0000-0000-000000000003'`)[0].n),1);
      await sql.unsafe("SET test.uid='00000000-0000-0000-0000-000000000003'");
      await sql`SELECT observe_return_offer('local-test','dismissed')`;
      const read = await assign(tabs[0]);
      assert.equal(read.dismissed,a.arm==='offer');
      await sql`SELECT record_return_checkout('00000000-0000-0000-0000-000000000003')`;
      assert.ok((await sql`SELECT checkout_at FROM return_experiment_accounts WHERE user_id='00000000-0000-0000-0000-000000000003'`)[0].checkout_at);
    } finally { await Promise.all(tabs.map(tab => tab.end())); }
    console.log('Trial history, D7, recovery, observations, segments, consent, concurrent assignment constraints and experiment revenue passed');
  } finally {
    await sql.end();
    await root.unsafe('DROP DATABASE ' + database);
  }
} finally {
  await root.end();
}
