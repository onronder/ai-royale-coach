import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface ApiRequestLog {
  id?: string;
  endpoint: string;
  query_key?: string;
  method: string;
  duration_ms?: number;
  cache_hit?: boolean;
  metadata?: Json;
}

class ApiMetricsLogger {
  private static instance: ApiMetricsLogger;
  private buffer: ApiRequestLog[] = [];
  private flushInterval: ReturnType<typeof setTimeout> | null = null;
  private isEnabled = false;
  private userId: string | null = null;

  private constructor() {
    // Start flush interval
    this.startFlushInterval();
  }

  static getInstance(): ApiMetricsLogger {
    if (!ApiMetricsLogger.instance) {
      ApiMetricsLogger.instance = new ApiMetricsLogger();
    }
    return ApiMetricsLogger.instance;
  }

  enable(userId: string) {
    if (this.userId !== userId) this.buffer = [];
    this.isEnabled = true;
    this.userId = userId;
  }

  disable() {
    this.isEnabled = false;
    this.userId = null;
    this.buffer = [];
  }

  private startFlushInterval() {
    if (this.flushInterval) return;
    
    // Flush every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000);
  }

  log(request: ApiRequestLog) {
    if (!this.isEnabled) return;
    
    const existingMetadata = typeof request.metadata === 'object' && request.metadata !== null && !Array.isArray(request.metadata)
      ? request.metadata as Record<string, Json>
      : {};
    
    this.buffer.push({
      ...request,
      id: crypto.randomUUID(),
      metadata: {
        ...existingMetadata,
        timestamp: Date.now(),
      } as Json,
    });

    // Auto-flush if buffer is large
    if (this.buffer.length >= 50) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0 || !this.userId) return;

    const owner = this.userId;
    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      const { error } = await supabase.from('api_request_logs').upsert(
        logsToSend.map((log) => ({
          id: log.id,
          user_id: owner,
          endpoint: log.endpoint,
          query_key: log.query_key,
          method: log.method,
          duration_ms: log.duration_ms,
          cache_hit: log.cache_hit ?? null,
          metadata: log.metadata ?? {},
        })), { onConflict: 'id', ignoreDuplicates: true }
      );

      if (error) {
        console.error('[ApiMetrics] Failed to flush logs:', error);
        // Re-add failed logs to buffer (up to limit)
        if (this.userId === owner && this.isEnabled && this.buffer.length < 100) {
          this.buffer = [...logsToSend.slice(0, 50), ...this.buffer];
        }
      }
    } catch (err) {
      console.error('[ApiMetrics] Flush error:', err);
    }
  }

  // Helper to wrap async functions with timing
  async trackAsync<T>(
    endpoint: string,
    method: string,
    fn: () => Promise<T>,
    queryKey?: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.log({
        endpoint,
        method,
        query_key: queryKey,
        duration_ms: duration,
      });
      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      this.log({
        endpoint,
        method,
        query_key: queryKey,
        duration_ms: duration,
        metadata: { error: true },
      });
      throw err;
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

export const apiMetrics = ApiMetricsLogger.getInstance();

// Hook for React Query integration
export function createMetricsMiddleware(queryClient: unknown) {
  return queryClient;
}
