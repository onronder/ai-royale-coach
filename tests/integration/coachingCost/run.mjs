// Opt-in real-provider pilot. No database, customer, game, email or payment access.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const here = path.dirname(new URL(import.meta.url).pathname);
const catalog = JSON.parse(fs.readFileSync(path.join(here, 'catalog.json'), 'utf8'));
const prompts = JSON.parse(fs.readFileSync(path.join(here, 'prompts.json'), 'utf8'));
// Refuse a stale 'new' fixture before an opt-in paid run.
const sourceRoot = process.cwd();
const freeSource = fs.readFileSync(path.join(sourceRoot, 'supabase/functions/first-value-coaching/handler.ts'), 'utf8');
const paidSource = fs.readFileSync(path.join(sourceRoot, 'supabase/functions/first-session-coaching/index.ts'), 'utf8');
for (const [key, source] of [['newFree', freeSource], ['newPaid', paidSource], ['newFollow', paidSource]]) {
  if (!source.includes('`' + prompts[key] + '`')) throw new Error('Refresh reviewed prompt snapshot: ' + key);
}
const card = c => ({ id: c.id, name: c.name, displayLevel: Number.isInteger(c.level) && Number.isInteger(c.maxLevel) && c.level > 0 && c.level <= c.maxLevel ? c.level + 16 - c.maxLevel : null, elixirCost: c.elixirCost });
const table = cards => ({ columns: ['id', 'name', 'displayLevel', 'elixirCost'], rows: cards.map(c => { const v = card(c); return [v.id, v.name, v.displayLevel, v.elixirCost ?? null]; }) });
const pick = name => { const c = catalog.find(c => c.name === name); if (!c) throw new Error('Fixture card missing'); return { ...c }; };
const heavy = ['P.E.K.K.A', 'Mini P.E.K.K.A', 'Valkyrie', 'Wizard', 'Baby Dragon', 'Giant', 'Fireball', 'Arrows'].map(pick);
const balanced = ['Knight', 'Archers', 'Skeletons', 'Ice Spirit', 'Giant', 'Wizard', 'Fireball', 'Arrows'].map(pick);
const restricted = catalog.map((c, i) => heavy.some(d => d.id === c.id) || ['Skeletons', 'Ice Spirit'].includes(c.name) ? c : { ...c, level: i % 2 ? 1 : 0, maxLevel: i % 2 ? 16 : undefined });
const cases = [
  { id: 'en-free-full', language: 'en', kind: 'Free', tier: 'free', deck: heavy, cards: catalog },
  { id: 'tr-free-levels', language: 'tr', kind: 'Free', tier: 'free', deck: heavy, cards: restricted },
  { id: 'es-trial-keep', language: 'es', kind: 'Paid', tier: 'trial', deck: balanced, cards: balanced, keep: true },
  { id: 'fr-paid-full', language: 'fr', kind: 'Paid', tier: 'paid', deck: heavy, cards: catalog },
  { id: 'pt-trial-full', language: 'pt', kind: 'Paid', tier: 'trial', deck: heavy, cards: catalog },
  { id: 'en-paid-follow', language: 'en', kind: 'Follow', tier: 'paid', deck: heavy, cards: catalog, question: 'Is there another owned card I can use instead for this practice?' },
  { id: 'tr-trial-follow', language: 'tr', kind: 'Follow', tier: 'trial', deck: heavy, cards: catalog, question: 'Bu değişiklikle kesin kazanır mıyım?' },
  { id: 'fr-paid-unknown-keep', language: 'fr', kind: 'Paid', tier: 'paid', deck: balanced.map((c, i) => i ? c : { ...c, maxLevel: undefined }), keep: true },
];
cases[7].cards = cases[7].deck;
const render = (template, c) => {
  const bindings = { source: { cards: c.deck }, sourceDeck: c.deck, player: { cards: c.cards }, original: c.deck,
    candidates: c.cards.filter(x => !c.deck.some(d => d.id === x.id)), question: c.question,
    currentSwap: { removed: pick('Giant'), added: pick('Skeletons') }, coachingCard: card, coachingCardTable: table, language: c.language };
  // Templates are reviewed source snapshots, never user input.
  return new Function(...Object.keys(bindings), 'return `' + template + '`')(...Object.values(bindings));
};
const jobs = cases.flatMap((c, i) => (i % 2 ? ['new', 'old'] : ['old', 'new']).map(variant => ({ c, variant, prompt: render(prompts[variant + c.kind], c) })));
if (jobs.length !== 16 || catalog.length !== 123) throw new Error('Unexpected benchmark size');
for (const c of cases) {
  for (const rows of [c.deck, c.cards]) {
    const t = table(rows);
    if (JSON.stringify(t.rows) !== JSON.stringify(rows.map(c => { const v = card(c); return [v.id, v.name, v.displayLevel, v.elixirCost ?? null]; }))) throw new Error('Card loss');
  }
}
if (!process.argv.includes('--run')) {
  console.log(JSON.stringify({ dry_run: true, requests: jobs.length, cases: cases.map(c => c.id), prompt_bytes: jobs.map(j => ({ id: j.c.id, variant: j.variant, bytes: Buffer.byteLength(j.prompt) })) }));
  process.exit(0);
}
if (process.env.BENCHMARK_CONFIRM !== 'pr30-16-requests' || !process.env.LOVABLE_API_KEY) throw new Error('Explicit benchmark confirmation and private provider environment required');
const out = process.env.BENCHMARK_OUTPUT;
if (!out?.startsWith('/tmp/') || fs.existsSync(out)) throw new Error('Use a new /tmp output path; never repeat a partial run');
fs.writeFileSync(out, '', { flag: 'wx', mode: 0o600 });
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { createOpenAI } = await import(require.resolve('@ai-sdk/openai'));
const { streamText, Output } = await import(require.resolve('ai'));
const { z } = await import(require.resolve('zod'));
const Suggestion = z.object({ remove_id: z.number().nullable(), add_id: z.number().nullable(), reason: z.string(), practice: z.string() });
const FreeSuggestion = z.object({ remove_id: z.number(), add_id: z.number(), reason: z.string(), practice: z.string() });
const Answer = z.object({ answer: z.string(), alternative_id: z.number().nullable(), reason: z.string().nullable(), practice: z.string().nullable() });
const key = process.env.LOVABLE_API_KEY;
let calls = 0;
const append = record => { const line = JSON.stringify(record); fs.appendFileSync(out, line + '\n'); console.log(line); };
for (const job of jobs) {
  const { c, variant, prompt } = job;
  let runId = null, requestHash = null;
  const provider = createOpenAI({ apiKey: key, baseURL: 'https://ai.gateway.lovable.dev/v1', headers: { 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: async (url, init) => {
      if (String(url) !== 'https://ai.gateway.lovable.dev/v1/responses' || ++calls > 16) throw new Error('Benchmark network limit');
      requestHash = createHash('sha256').update(init.body).digest('hex');
      // Persist the attempt before sending so interrupted runs are never blindly repeated.
      fs.appendFileSync(out, JSON.stringify({ attempt: calls, case: c.id, variant, request_hash: requestHash }) + '\n');
      const r = await fetch(url, init); runId = r.headers.get('x-lovable-aig-run-id'); return r;
    } });
  const started = performance.now();
  try {
    const result = streamText({ model: provider.responses('openai/gpt-6-astra'), system: render(prompts.system, c), messages: [{ role: 'user', content: prompt }],
      output: Output.object({ schema: c.kind === 'Follow' ? Answer : c.kind === 'Free' ? FreeSuggestion : Suggestion }),
      abortSignal: AbortSignal.timeout(90000), maxRetries: 0, ...(c.tier === 'free' ? { maxOutputTokens: 4096 } : {}),
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', include: ['reasoning.encrypted_content'] } } });
    const output = await result.output, usage = await result.usage, response = await result.response;
    if (!output) throw new Error('Missing structured output');
    let valid;
    if (c.kind === 'Follow') valid = output.alternative_id === null || c.cards.some(x => x.id === output.alternative_id && card(x).displayLevel !== null && !c.deck.some(d => d.id === x.id));
    else valid = output.remove_id === null && output.add_id === null && c.kind !== 'Free' || c.deck.some(d => d.id === output.remove_id && card(d).displayLevel !== null) && c.cards.some(x => x.id === output.add_id && card(x).displayLevel !== null && !c.deck.some(d => d.id === x.id));
    if (c.keep && (output.remove_id !== null || output.add_id !== null)) valid = false;
    append({ case: c.id, language: c.language, tier: c.tier, variant, output, valid_card_choice: valid, usage, run_id: runId, response_id: response.id, served_model: response.modelId, duration_ms: Math.round(performance.now() - started), request_hash: requestHash });
    if ((usage.outputTokens ?? 0) > 1500) throw new Error('Output budget guard');
  } catch (error) {
    append({ case: c.id, variant, stopped: true, error_type: error?.name ?? 'Error', calls });
    process.exitCode = 1; break;
  }
}
console.log(JSON.stringify({ total_provider_requests: calls, output_file: out, automatic_retries: 0 }));
