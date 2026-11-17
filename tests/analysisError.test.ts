import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analysisErrorResponse } from '../supabase/functions/_shared/analysis-error';
import { readAnalysisServiceError, retryAnalysisError } from '../src/lib/analysisError';

describe('analysis gateway failures', () => {
  it('preserves 402, top-up remedy and terminal props through the function client', async () => {
    const response = analysisErrorResponse(402, JSON.stringify({ message: 'Not enough credits / top up required', type: 'payment_required', props: { requires: 'top_up', retryable: false } }));
    assert.equal(response.status, 402);
    const body = await response.clone().json();
    assert.equal(body.props.requires, 'top_up');
    assert.equal(body.props.retryable, false);
    const error = await readAnalysisServiceError({ context: response });
    assert.equal(error?.message, 'Not enough credits / top up required');
    assert.equal(retryAnalysisError(error, 0, 2), false);
  });
  it('preserves 403 provider denial without retry or subscription misclassification', async () => {
    const response = analysisErrorResponse(403, '{"error":{"message":"Provider access denied"}}');
    const error = await readAnalysisServiceError({ context: response });
    assert.equal(error?.status, 403);
    assert.equal(error?.message, 'Provider access denied');
    assert.equal(retryAnalysisError(error, 0, 2), false);
  });
  it('keeps transient retries bounded', async () => {
    for (const status of [429, 503]) {
      const error = await readAnalysisServiceError({ context: analysisErrorResponse(status, '{}') });
      assert.equal(retryAnalysisError(error, 0, 2), true);
      assert.equal(retryAnalysisError(error, 2, 2), false);
    }
  });
  it('does not reinterpret subscription errors', async () => {
    assert.equal(await readAnalysisServiceError({ context: new Response('{"subscription_required":true}', { status: 403 }) }), null);
  });
});