import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RevenueFilter = { from: string | null; to: string | null; includeTests: boolean };
import type { Transitions } from '@/lib/revenueFunnel';

export type RevenueOverview = {
  transitions: Transitions; incomplete_orders: number; undated_orders: number;
  generated_at: string; counts: Record<string, number>; ui_measured_signups: number; measured_since: string;
  cash_net_cents: Record<string, number>; refunded_cents: Record<string, number>;
  mrr: { available: boolean; reason?: string };
};
export type RevenueDetailRow = {
  user_id: string; email: string | null; signup_at: string; verified_at: string | null; trial_start: string | null; trial_end: string | null;
  undated_payment: boolean; first_paid_at: string | null; first_renewal_at: string | null; sub_status: string | null; renewal_off: boolean; has_access: boolean; is_test: boolean;
};
export type DirectoryRow = {
  user_id: string; email: string | null; signup_at: string; last_step: string | null; access: string; renewal_off: boolean;
  marketing: string; security: 'ok' | 'review' | 'limited' | 'blocked'; tags: string[];
};
export type UnstartedAudience = { total: number; consented: number; sendable: number };

const call = async <T,>(fn: string, args: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown as T;
};

export function useRevenueOverview(f: RevenueFilter) {
  return useQuery({
    queryKey: ['admin-revenue-overview', f],
    refetchInterval: 15 * 60 * 1000,
    queryFn: () => call<RevenueOverview>('admin_revenue_overview', { p_from: f.from, p_to: f.to, p_include_tests: f.includeTests }),
    retry: 1,
  });
}

export function useRevenueDetail(metric: string | null, f: RevenueFilter, page: number, asOf?: string, pageSize = 25) {
  return useQuery({
    queryKey: ['admin-revenue-detail', metric, f, page, asOf],
    enabled: !!metric,
    placeholderData: keepPreviousData,
    queryFn: () => call<{ total: number; rows: RevenueDetailRow[] }>('admin_revenue_detail', {
      p_metric: metric, p_at: asOf, p_from: f.from, p_to: f.to, p_include_tests: f.includeTests, p_limit: pageSize, p_offset: page * pageSize,
    }),
  });
}

export function useUserDirectory(search: string, page: number, access: string, pageSize = 25) {
  return useQuery({
    queryKey: ['admin-user-directory', search, page, access],
    placeholderData: keepPreviousData,
    queryFn: () => call<{ total: number; rows: DirectoryRow[] }>('admin_user_directory', { p_search: search || null, p_access: access || null, p_limit: pageSize, p_offset: page * pageSize }),
  });
}

export function useUnstartedAudience(includeTests: boolean) {
  return useQuery({
    queryKey: ['admin-unstarted-audience', includeTests],
    queryFn: () => call<UnstartedAudience>('admin_unstarted_audience', { p_include_tests: includeTests }),
  });
}
