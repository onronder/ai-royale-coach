import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { providerUsage } from '../supabase/functions/_shared/ai-generation';

// Usage shape read from an existing Lovable coaching run on 2026-11-19.
// No customer prompt, output, credentials or real response ID is retained.
const response = {
  id: 'resp_fixture',
  usage: {
    input_tokens: 3167,
    input_tokens_details: {
      cache_write_tokens: 3164,
      cache_write_tokens_details: { ttl_12h_tokens: 0, ttl_30m_tokens: 3164 },
      cached_tokens: 0,
    },
    output_tokens: 71,
    total_tokens: 3238,
  },
};

describe('observed gateway usage shape', () => {
  for (const stream of [false, true]) it(`preserves cache writes separately from reads (${stream ? 'SSE' : 'JSON'})`, () => {
    const body = stream
      ? `data: ${JSON.stringify({ type: 'response.completed', response })}\n\n`
      : JSON.stringify(response);
    const result = providerUsage(body, stream);
    assert.equal(result.input_tokens, 3167);
    assert.equal(result.output_tokens, 71);
    assert.equal(result.cache_write_tokens, 3164);
    assert.equal(result.cached_input_tokens, 0);
    assert.equal(result.reasoning_tokens, null);
    assert.deepEqual(result.usage, response.usage);
    assert.equal(result.input_tokens! + result.output_tokens!, response.usage.total_tokens);
  });
});
