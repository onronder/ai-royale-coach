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

export interface EndpointGroup {
  name: string;
  pattern: string;
  endpoints: EndpointStats[];
  totalCount: number;
  avgDuration: number;
  cacheHitRate: number;
}

export interface TimelinePoint {
  time: string;
  count: number;
  cacheHits: number;
}

// Define endpoint grouping patterns
const ENDPOINT_GROUPS: { name: string; pattern: RegExp; priority: number }[] = [
  { name: 'Player Data', pattern: /^(player|clash-royale|battles)/, priority: 1 },
  { name: 'Deck & Cards', pattern: /^(deck|card|saved_decks|card_mastery|card_collection)/, priority: 2 },
  { name: 'Analytics', pattern: /^(api-metrics|cache-status|deck_usage)/, priority: 3 },
  { name: 'Achievements', pattern: /^(achievement|user_achievements)/, priority: 4 },
  { name: 'Auth & Profiles', pattern: /^(admin|profile|fraud|subscription)/, priority: 5 },
  { name: 'Operations', pattern: /^(operation|notification)/, priority: 6 },
  { name: 'Other', pattern: /.*/, priority: 99 },
];

function groupEndpoints(endpoints: EndpointStats[]): EndpointGroup[] {
  const groups: Map<string, EndpointStats[]> = new Map();
  
  // Initialize all groups
  ENDPOINT_GROUPS.forEach(g => groups.set(g.name, []));
  
  // Assign each endpoint to a group
  endpoints.forEach(ep => {
    for (const group of ENDPOINT_GROUPS) {
      if (group.pattern.test(ep.endpoint)) {
        const existing = groups.get(group.name) || [];
        existing.push(ep);
        groups.set(group.name, existing);
        break;
      }
    }
  });
  
  // Convert to EndpointGroup format
  return ENDPOINT_GROUPS
    .map(g => {
      const eps = groups.get(g.name) || [];
      if (eps.length === 0) return null;
      
      const totalCount = eps.reduce((sum, e) => sum + e.count, 0);
      const weightedDuration = eps.reduce((sum, e) => sum + e.avgDuration * e.count, 0);
      const weightedCache = eps.reduce((sum, e) => sum + e.cacheHitRate * e.count, 0);
      
      return {
        name: g.name,
        pattern: g.pattern.source,
        endpoints: eps.sort((a, b) => b.count - a.count),
        totalCount,
        avgDuration: totalCount > 0 ? Math.round(weightedDuration / totalCount) : 0,
        cacheHitRate: totalCount > 0 ? Math.round(weightedCache / totalCount) : 0,
      };
    })
    .filter((g): g is EndpointGroup => g !== null && g.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount);
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
  const { data: endpointsRaw, isLoading: endpointsLoading } = useQuery({
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
        .sort((a, b) => b.count - a.count);
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  // Compute grouped endpoints
  const endpointGroups = endpointsRaw ? groupEndpoints(endpointsRaw) : [];
  const endpoints = endpointsRaw?.slice(0, 20);

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
    endpointGroups,
    timeline,
    recentLogs,
    isLoading: statsLoading || endpointsLoading || timelineLoading || logsLoading,
    refetch: () => {
      refetchStats();
      refetchLogs();
    },
  };
}
