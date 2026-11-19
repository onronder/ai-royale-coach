import { useTranslation } from "react-i18next";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAccess } from './useAdminAccess';

export interface ApiMetricsStats {
  totalRequests: number;
  requestsPerMinute: number;
  cacheHitRate: number | null;
  slowQueries: number | null;
  durationSamples: number;
  avgDuration: number | null;
}

export interface EndpointStats {
  durationSamples: number;
  cacheSamples: number;
  endpoint: string;
  count: number;
  avgDuration: number | null;
  cacheHitRate: number | null;
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
      const weightedDuration = eps.reduce((sum, e) => sum + (e.avgDuration ?? 0) * e.durationSamples, 0);
      const weightedCache = eps.reduce((sum, e) => sum + (e.cacheHitRate ?? 0) * e.cacheSamples, 0);
      
      const durationSamples = eps.reduce((sum, e) => sum + e.durationSamples, 0);
      const cacheSamples = eps.reduce((sum, e) => sum + e.cacheSamples, 0);
      return {
        name: g.name,
        pattern: g.pattern.source,
        endpoints: eps.sort((a, b) => b.count - a.count),
        totalCount,
        avgDuration: durationSamples > 0 ? Math.round(weightedDuration / durationSamples) : null,
        cacheHitRate: cacheSamples > 0 ? Math.round(weightedCache / cacheSamples) : null,
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

  const { data: report, isLoading: statsLoading, error, refetch: refetchStats } = useQuery({
    queryKey: ['api-metrics-report', timeframe],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_api_measurements', { p_minutes: timeframeMins });
      if (error) throw error;
      return data as unknown as { stats: ApiMetricsStats; endpoints: EndpointStats[]; timeline: TimelinePoint[] };
    },
    enabled: isAdmin,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const stats = report?.stats;
  const endpointGroups = groupEndpoints(report?.endpoints ?? []);
  const endpoints = report?.endpoints.slice(0, 20);
  const timeline = report?.timeline.map(point => ({ ...point,
    time: new Date(point.time).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
  }));

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
    isLoading: statsLoading || logsLoading,
    error,
    refetch: () => {
      refetchStats();
      refetchLogs();
    },
  };
}
