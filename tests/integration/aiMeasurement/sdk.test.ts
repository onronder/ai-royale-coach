import { z } from 'npm:zod@3'
import { createCoachingAI } from '../../../supabase/functions/_shared/coaching-ai.ts'

Deno.test('real coaching SDK persists a streamed result and replays without another provider call', async () => {
  let calls = 0, saved: any = null
  const db = { rpc: async (name: string, args: any) => {
    if (name === 'claim_ai_generation') return { error: null, data: saved
      ? { decision: 'replay', body: saved.body, status: saved.status, headers: saved.headers }
      : { decision: 'acquired', id: 'fixture' } }
    saved = args.p_result
    return { data: null, error: null }
  } }
  const original = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (!String(url).includes('/responses')) throw new Error('Unexpected network request')
    calls++
    const text = JSON.stringify({ answer: 'One specific practice' })
    const part = { type: 'output_text', text, annotations: [] }
    const item = { id: 'msg_fixture', type: 'message', role: 'assistant', content: [part], status: 'completed' }
    const response = { id: 'resp_fixture', created_at: 1795089600, model: 'openai/gpt-6-astra', status: 'completed',
      output: [item], usage: { input_tokens: 11, output_tokens: 9, input_tokens_details: { cached_tokens: 4 }, output_tokens_details: { reasoning_tokens: 2 } } }
    const events = [
      { type: 'response.created', response: { ...response, status: 'in_progress', output: [] } },
      { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', content: [] } },
      { type: 'response.content_part.added', item_id: item.id, output_index: 0, content_index: 0, part: { ...part, text: '' } },
      { type: 'response.output_text.delta', item_id: item.id, output_index: 0, content_index: 0, delta: text },
      { type: 'response.output_text.done', item_id: item.id, output_index: 0, content_index: 0, text },
      { type: 'response.content_part.done', item_id: item.id, output_index: 0, content_index: 0, part },
      { type: 'response.output_item.done', output_index: 0, item },
      { type: 'response.completed', response },
    ]
    return new Response(events.map(e => 'data: ' + JSON.stringify(e) + '\n\n').join(''), {
      headers: { 'content-type': 'text/event-stream', 'x-lovable-aig-run-id': 'run_fixture' },
    })
  }
  try {
    const ai = createCoachingAI('fake-key', AbortSignal.timeout(10000), 'en', true, { db, userId: 'fixture', tier: 'free', feature: 'first-value-coaching:generate' })
    const first = await ai('fixture prompt', z.object({ answer: z.string() }))
    if (first.output.answer !== 'One specific practice' || first.usage.inputTokens !== 11 || saved?.state !== 'completed') throw new Error('SDK/ledger mismatch')
    const second = await ai('fixture prompt', z.object({ answer: z.string() }))
    if (second.output.answer !== first.output.answer || calls !== 1) throw new Error('Repeated provider call')
    if (saved.input_tokens !== 11 || saved.reasoning_tokens !== 2) throw new Error('Usage not persisted')
  } finally { globalThis.fetch = original }
})
