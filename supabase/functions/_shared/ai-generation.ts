// Provider-boundary guard: call only AFTER authentication and the feature's existing access checks.
// A stored response can be replayed after a downstream save fails; an unknown outcome cannot be retried.
type Database = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> }
export type AIContext = { db: Database; userId: string; feature: string; tier: 'free' | 'trial' | 'paid' | 'admin' | 'inactive' }
type Claim = { decision: string; id: string; body?: string; headers?: Record<string, string>; status?: number }
const encoder = new TextEncoder()
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}'
  return JSON.stringify(value)
}
const count = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

export function providerUsage(body: string, stream: boolean) {
  const observed: { usage: Record<string, unknown> | null } = { usage: null }
  let responseId: string | null = null, complete = false
  const consume = (input: unknown) => {
    const value = object(input), response = object(value.response ?? value)
    if (typeof response.id === 'string') responseId = response.id
    if (response.usage) observed.usage = object(response.usage)
    if (value.type === 'response.completed') complete = true
    if (value.type === 'error' || value.type === 'response.failed' || value.type === 'response.incomplete' || value.error)
      throw new Error('Incomplete AI response')
  }
  if (stream) {
    for (const event of body.split(/\r?\n\r?\n/)) {
      const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n').trim()
      if (data === '[DONE]') complete = true
      else if (data) consume(JSON.parse(data))
    }
  } else {
    consume(JSON.parse(body))
    complete = true
  }
  if (!complete) throw new Error('AI stream did not finish')
  const usage = observed.usage
  const inputDetails = object(usage?.input_tokens_details ?? usage?.prompt_tokens_details)
  const outputDetails = object(usage?.output_tokens_details ?? usage?.completion_tokens_details)
  // Cached input and reasoning are subsets, never extra tokens added to the total.
  return {
    usage, response_id: responseId,
    input_tokens: count(usage?.input_tokens ?? usage?.prompt_tokens),
    output_tokens: count(usage?.output_tokens ?? usage?.completion_tokens),
    cached_input_tokens: count(inputDetails.cached_tokens),
    cache_write_tokens: count(inputDetails.cache_write_tokens),
    reasoning_tokens: count(outputDetails.reasoning_tokens),
  }
}

export function createMeasuredAIFetch(context: AIContext, upstream: typeof fetch = fetch): typeof fetch {
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await context.db.rpc(name, args)
    if (error) throw new Error('AI attempt storage unavailable')
    return data
  }
  return async (input, init) => {
    // Only the two existing AI endpoints; never capture auth, game API or billing requests.
    const url = new URL(input instanceof Request ? input.url : input.toString())
    if (url.origin !== 'https://ai.gateway.lovable.dev' || !['/v1/chat/completions', '/v1/responses'].includes(url.pathname))
      throw new Error('Unsupported AI endpoint')
    if (!context.userId || !context.feature || typeof init?.body !== 'string') throw new Error('Missing AI context')
    const request = JSON.parse(init.body)
    const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(canonical({ version: 1, path: url.pathname, request })))
    const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
    const claim = await rpc('claim_ai_generation', {
      p_user: context.userId, p_feature: context.feature, p_hash: hash, p_model: request.model, p_tier: context.tier,
    }) as Claim
    if (claim.decision === 'replay') return new Response(claim.body, {
      status: claim.status, headers: { ...claim.headers, 'X-AI-Response-Replayed': 'true' },
    })
    if (claim.decision !== 'acquired') return new Response(JSON.stringify({
      message: claim.decision === 'pending' ? 'This analysis is already being generated.' : 'The previous analysis outcome needs checking. No new generation was started.',
      type: 'ai_generation_' + claim.decision, ai_gateway_error: true,
    }), { status: 409, headers: { 'Content-Type': 'application/json' } })

    const start = performance.now()
    const headers: Record<string, string> = {}
    let status: number | null = null
    const finish = (result: Record<string, unknown>) => rpc('finish_ai_generation', {
      p_id: claim.id, p_result: { duration_ms: Math.round(performance.now() - start), status,
        headers, run_id: headers['x-lovable-aig-run-id'] ?? null, ...result },
    })
    const uncertain = async () => {
      // If this write also fails, the durable running claim still blocks another provider call.
      try { await finish({ state: 'uncertain' }) } catch { /* Keep the claim; never reset it. */ }
    }
    try {
      const response = await upstream(input, init)
      status = response.status
      for (const name of ['content-type', 'x-lovable-aig-run-id', 'x-request-id']) {
        const value = response.headers.get(name)
        if (value) headers[name] = value
      }
      if (!response.ok) {
        // Explicit request rejection permits a later attempt. Server/network failures are ambiguous.
        await finish({ state: [400, 401, 402, 403, 404, 422, 429].includes(status) ? 'rejected' : 'uncertain' })
        return response
      }
      if (!response.body) throw new Error('AI returned no body')
      const stream = (headers['content-type'] ?? '').includes('text/event-stream')
      const reader = response.body.getReader(), decoder = new TextDecoder()
      let body = '', size = 0, ended = false
      // Backpressure and incremental output are preserved. Persist before the final stream close.
      const tracked = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const chunk = await reader.read()
            if (chunk.done) {
              body += decoder.decode()
              await finish({ state: 'completed', body, ...providerUsage(body, stream) })
              ended = true
              controller.close()
            } else {
              size += chunk.value.byteLength
              if (size > MAX_RESPONSE_BYTES) throw new Error('AI response too large to safely replay')
              body += decoder.decode(chunk.value, { stream: true })
              controller.enqueue(chunk.value)
            }
          } catch (error) {
            await uncertain()
            await reader.cancel().catch(() => {})
            controller.error(error)
          }
        },
        async cancel(reason) {
          if (!ended) await uncertain()
          await reader.cancel(reason)
        },
      })
      return new Response(tracked, { status, headers: response.headers })
    } catch (error) {
      await uncertain()
      throw error
    }
  }
}
