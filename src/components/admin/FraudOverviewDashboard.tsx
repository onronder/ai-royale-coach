import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  Activity,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FraudOverviewStats {
  total_signals: number;
  signals_today: number;
  soft_blocked_users: number;
  warned_users: number;
  pending_reviews: number;
  signals_by_type: Record<string, number>;
}

/**
 * Admin dashboard overview showing fraud detection metrics.
 */
export function FraudOverviewDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['fraud-overview-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_fraud_overview_stats');
      
      if (error) {
        console.error('Failed to fetch fraud stats:', error);
        return null;
      }
      
      return data as unknown as FraudOverviewStats;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Signals Today',
      value: stats?.signals_today || 0,
      icon: Activity,
      color: 'text-blue-500',
    },
    {
      title: 'Pending Reviews',
      value: stats?.pending_reviews || 0,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'Soft Blocked',
      value: stats?.soft_blocked_users || 0,
      icon: Shield,
      color: 'text-red-500',
    },
    {
      title: 'Warned Users',
      value: stats?.warned_users || 0,
      icon: AlertTriangle,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signals by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Signals by Type (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.signals_by_type ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.signals_by_type).map(([type, count]) => (
                <div key={type} className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground capitalize">
                    {type.replace('_', ' ')}
                  </div>
                  <div className="text-xl font-semibold mt-1">{count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              No fraud signals detected in the last 30 days
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Signals Summary */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats?.total_signals || 0}
          </div>
          <p className="text-sm text-muted-foreground">
            Total fraud signals in the last 30 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
