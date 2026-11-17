export class AnalysisServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'AnalysisServiceError';
  }
}

/** The function client puts non-2xx response bodies in error.context. */
export async function readAnalysisServiceError(error: unknown): Promise<AnalysisServiceError | null> {
  if (!error || typeof error !== 'object' || !('context' in error) || !(error.context instanceof Response)) return null;
  const response = error.context;
  try {
    const body = await response.clone().json();
    if (body.ai_gateway_error === true && typeof body.error === 'string') {
      return new AnalysisServiceError(body.error, response.status);
    }
  } catch { /* Other function errors retain their existing handling. */ }
  return null;
}

export function retryAnalysisError(error: unknown, failureCount: number, maxRetries: number): boolean {
  if (error instanceof AnalysisServiceError && error.status !== 429 && error.status < 500) return false;
  return failureCount < maxRetries;
}