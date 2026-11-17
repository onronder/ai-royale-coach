import { errorResponse } from './cors.ts';

/** Preserve terminal gateway errors instead of disguising them as server failures. */
export function analysisErrorResponse(status: number, body: string): Response {
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(body); } catch { /* Use a safe fallback, not raw provider text. */ }
  const nested = payload.error && typeof payload.error === 'object'
    ? payload.error as Record<string, unknown> : {};
  const message = [payload.message, nested.message, payload.title].find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  ) ?? (status === 402
    ? 'Not enough AI credits. The workspace owner must add credits.'
    : 'AI service request failed.');
  return errorResponse(message, status, {
    ai_gateway_error: true,
    ...(typeof payload.type === 'string' ? { type: payload.type } : {}),
    ...(payload.props && typeof payload.props === 'object' ? { props: payload.props } : {}),
  });
}