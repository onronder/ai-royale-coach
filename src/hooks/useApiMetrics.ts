import { useTranslation } from "react-i18next";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAccess } from './useAdminAccess';
import { combineMeasured, measuredAverage, measuredRate } from '@/lib/metricSummary';

export interface ApiMetricsStats {
  totalRequests: number;
  requestsPerMinute: number;
  /** null = no request recorded a cache flag */
  cacheHitRate: number | null;
  slowQueries: number;
  /** null = no request recorded a duration */
  avgDuration: number | null;
  durationMeasured: number;
}

export interface EndpointStats {
  endpoint: string;
  count: number;
  avgDuration: number | null;
  cacheHitRate: number | null;
  durationMeasured: number;
  cacheMeasured: number;
}

export interface EndpointGroup {
  name: string;
  pattern: string;
  endpoints: EndpointStats[];
  totalCount: number;
  avgDuration: number | null;
  cacheHitRate: number | null;
}

export interface TimelinePoint {
  time: string;
  count: number;
  cacheHits: number;
}

// Define endpoint grouping patterns
const ENDPOINT_GROUPS: { name: string; pattern: RegExp; priority: number }[] = [
  { name: 'admin.apiMetrics.playerGroup', pattern: /^(player|clash-royale|battles)/, priority: 1 },
  { name: 'admin.apiMetrics.deckGroup', pattern: /^(deck|card|saved_decks|card_mastery|card_collection)/, priority: 2 },
  { name: 'dashboard.subtabs.analytics', pattern: /^(api-metrics|cache-status|deck_usage)/, priority: 3 },
  { name: 'achievements.title', pattern: /^(achievement|user_achievements)/, priority: 4 },
  { name: 'admin.apiMetrics.profileGroup', pattern: /^(admin|profile|fraud|subscription)/, priority: 5 },
  { name: 'admin.apiMetrics.operationGroup', pattern: /^(operation|notification)/, priority: 6 },
  { name: 'trialFollowup.other', pattern: /.*/, priority: 99 },
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
      const duration = combineMeasured(eps.map(e => ({ average: e.avgDuration, measured: e.durationMeasured, total: e.count })));
      const cache = combineMeasured(eps.map(e => ({ average: e.cacheHitRate, measured: e.cacheMeasured, total: e.count })));
      
      return {
        name: g.name,
        pattern: g.pattern.source,
        endpoints: eps.sort((a, b) => b.count - a.count),
        totalCount,
        avgDuration: duration.average === null ? null : Math.round(duration.average),
        cacheHitRate: cache.average === null ? null : Math.round(cache.average),
      };
    })
    .filter((g): g is EndpointGroup => g !== null && g.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount);
}

export function useApiMetrics(timeframe: '15min' | '1hr' | '24hr' = '1hr') {
  const { i18n } = useTranslation();
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
      const cache = measuredRate(logs.map((l) => l.cache_hit));
      const slowQueries = logs.filter((l) => typeof l.duration_ms === 'number' && l.duration_ms > 1000).length;
      const duration = measuredAverage(logs.map((l) => l.duration_ms));

      return {
        totalRequests: total,
        requestsPerMinute: total / timeframeMins,
        cacheHitRate: cache.average,
        slowQueries,
        avgDuration: duration.average,
        durationMeasured: duration.measured,
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
            acc[log.endpoint] = { durations: [], flags: [] };
          }
          acc[log.endpoint].durations.push(log.duration_ms);
          acc[log.endpoint].flags.push(log.cache_hit);
          return acc;
        },
        {} as Record<string, { durations: (number | null)[]; flags: (boolean | null)[] }>
      );

      return Object.entries(grouped)
        .map(([endpoint, stats]) => {
          const d = measuredAverage(stats.durations);
          const c = measuredRate(stats.flags);
          return {
            endpoint,
            count: stats.durations.length,
            avgDuration: d.average === null ? null : Math.round(d.average),
            cacheHitRate: c.average === null ? null : Math.round(c.average),
            durationMeasured: d.measured,
            cacheMeasured: c.measured,
          };
        })
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
    queryKey: ['api-metrics-timeline', timeframe, i18n.language],
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
        time: new Date(time).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
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
