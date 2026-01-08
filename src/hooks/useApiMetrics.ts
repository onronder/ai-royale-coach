import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAccess } from './useAdminAccess';

export interface ApiMetricsStats {
  totalRequests: number;
  requestsPerMinute: number;
  cacheHitRate: number;
  slowQueries: number;
  avgDuration: number;
}

export interface EndpointStats {
  endpoint: string;
  count: number;
  avgDuration: number;
  cacheHitRate: number;
}

export interface TimelinePoint {
  time: string;
  count: number;
  cacheHits: number;
}

export function useApiMetrics(timeframe: '15min' | '1hr' | '24hr' = '1hr') {
  const { isAdmin } = useAdminAccess();

  const timeframeMins = {
    '15min': 15,
    '1hr': 60,
    '24hr': 1440,
  }[timeframe];

  const since = new Date(Date.now() - timeframeMins * 60 * 1000).toISOString();

  // Fetch overall stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['api-metrics-stats', timeframe],
    queryFn: async (): Promise<ApiMetricsStats> => {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select('duration_ms, cache_hit, created_at')
        .gte('created_at', since);

      if (error) throw error;

      const logs = data || [];
      const total = logs.length;
      const cacheHits = logs.filter((l) => l.cache_hit).length;
      const slowQueries = logs.filter((l) => (l.duration_ms ?? 0) > 1000).length;
      const totalDuration = logs.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0);

      return {
        totalRequests: total,
        requestsPerMinute: total / timeframeMins,
        cacheHitRate: total > 0 ? (cacheHits / total) * 100 : 0,
        slowQueries,
        avgDuration: total > 0 ? totalDuration / total : 0,
      };
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Fetch endpoint breakdown
  const { data: endpoints, isLoading: endpointsLoading } = useQuery({
    queryKey: ['api-metrics-endpoints', timeframe],
    queryFn: async (): Promise<EndpointStats[]> => {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select('endpoint, duration_ms, cache_hit')
        .gte('created_at', since);

      if (error) throw error;

      // Group by endpoint
      const grouped = (data || []).reduce(
        (acc, log) => {
          if (!acc[log.endpoint]) {
            acc[log.endpoint] = { count: 0, totalDuration: 0, cacheHits: 0 };
          }
          acc[log.endpoint].count++;
          acc[log.endpoint].totalDuration += log.duration_ms ?? 0;
          if (log.cache_hit) acc[log.endpoint].cacheHits++;
          return acc;
        },
        {} as Record<string, { count: number; totalDuration: number; cacheHits: number }>
      );

      return Object.entries(grouped)
        .map(([endpoint, stats]) => ({
          endpoint,
          count: stats.count,
          avgDuration: Math.round(stats.totalDuration / stats.count),
          cacheHitRate: Math.round((stats.cacheHits / stats.count) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  // Fetch timeline data
  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['api-metrics-timeline', timeframe],
    queryFn: async (): Promise<TimelinePoint[]> => {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select('created_at, cache_hit')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by minute
      const grouped = (data || []).reduce(
        (acc, log) => {
          const minute = new Date(log.created_at).toISOString().slice(0, 16);
          if (!acc[minute]) {
            acc[minute] = { count: 0, cacheHits: 0 };
          }
          acc[minute].count++;
          if (log.cache_hit) acc[minute].cacheHits++;
          return acc;
        },
        {} as Record<string, { count: number; cacheHits: number }>
      );

      return Object.entries(grouped).map(([time, stats]) => ({
        time: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        count: stats.count,
        cacheHits: stats.cacheHits,
      }));
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  // Fetch recent logs
  const { data: recentLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['api-metrics-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });

  return {
    stats,
    endpoints,
    timeline,
    recentLogs,
    isLoading: statsLoading || endpointsLoading || timelineLoading || logsLoading,
    refetch: () => {
      refetchStats();
      refetchLogs();
    },
  };
}
