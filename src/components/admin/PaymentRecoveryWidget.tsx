import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface RecoveryMetrics {
  totalPastDue: number;
  recovered: number;
  stillPastDue: number;
  recoveryRate: number;
  avgRecoveryTimeHours: number | null;
  last30DaysRecovered: number;
  last30DaysFailed: number;
}

/**
 * Admin widget showing payment recovery metrics.
 * Tracks how many past_due users eventually paid and how long it took.
 */
export function PaymentRecoveryWidget() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['payment-recovery-metrics'],
    queryFn: async (): Promise<RecoveryMetrics> => {
      // Get all past_due events
      const { data: pastDueEvents, error: pastDueError } = await supabase
        .from('webhook_events')
        .select('user_id, created_at')
        .in('event_type', ['subscription.past_due', 'payment_failed_email_sent'])
        .order('created_at', { ascending: true });

      if (pastDueError) {
        console.error('Failed to fetch past_due events:', pastDueError);
        throw pastDueError;
      }

      // Get recovery events (subscription became active again after past_due)
      const { data: recoveryEvents, error: recoveryError } = await supabase
        .from('webhook_events')
        .select('user_id, created_at')
        .in('event_type', ['subscription.updated', 'subscription.active'])
        .order('created_at', { ascending: true });

      if (recoveryError) {
        console.error('Failed to fetch recovery events:', recoveryError);
        throw recoveryError;
      }

      // Get current subscription statuses
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select('user_id, status, updated_at');

      if (subError) {
        console.error('Failed to fetch subscriptions:', subError);
        throw subError;
      }

      // Build a map of users who went past_due
      const pastDueUsers = new Map<string, Date>();
      pastDueEvents?.forEach(event => {
        if (event.user_id && !pastDueUsers.has(event.user_id)) {
          pastDueUsers.set(event.user_id, new Date(event.created_at));
        }
      });

      // Calculate recoveries
      let recovered = 0;
      let totalRecoveryTimeHours = 0;
      const recoveredUserIds = new Set<string>();

      const subscriptionMap = new Map(
        subscriptions?.map(s => [s.user_id, s]) || []
      );

      // Check which past_due users are now active
      pastDueUsers.forEach((pastDueDate, userId) => {
        const sub = subscriptionMap.get(userId);
        if (sub && sub.status === 'active') {
          recovered++;
          recoveredUserIds.add(userId);
          
          // Find recovery event after past_due
          const recoveryEvent = recoveryEvents?.find(
            e => e.user_id === userId && new Date(e.created_at) > pastDueDate
          );
          
          if (recoveryEvent) {
            const recoveryTime = new Date(recoveryEvent.created_at).getTime() - pastDueDate.getTime();
            totalRecoveryTimeHours += recoveryTime / (1000 * 60 * 60);
          } else if (sub.updated_at) {
            // Fallback to subscription updated_at
            const recoveryTime = new Date(sub.updated_at).getTime() - pastDueDate.getTime();
            totalRecoveryTimeHours += recoveryTime / (1000 * 60 * 60);
          }
        }
      });

      const totalPastDue = pastDueUsers.size;
      const stillPastDue = totalPastDue - recovered;
      const recoveryRate = totalPastDue > 0 ? (recovered / totalPastDue) * 100 : 0;
      const avgRecoveryTimeHours = recovered > 0 ? totalRecoveryTimeHours / recovered : null;

      // Last 30 days metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let last30DaysRecovered = 0;
      let last30DaysFailed = 0;
      
      pastDueUsers.forEach((pastDueDate, userId) => {
        if (pastDueDate >= thirtyDaysAgo) {
          if (recoveredUserIds.has(userId)) {
            last30DaysRecovered++;
          } else {
            last30DaysFailed++;
          }
        }
      });

      return {
        totalPastDue,
        recovered,
        stillPastDue,
        recoveryRate,
        avgRecoveryTimeHours,
        last30DaysRecovered,
        last30DaysFailed,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-12 mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (hours: number | null) => {
    if (hours === null) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const statItems = [
    {
      label: 'Total Past Due',
      value: metrics?.totalPastDue || 0,
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Recovered',
      value: metrics?.recovered || 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Still Past Due',
      value: metrics?.stillPastDue || 0,
      icon: CreditCard,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Avg Recovery Time',
      value: formatTime(metrics?.avgRecoveryTimeHours ?? null),
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      isText: true,
    },
  ];

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-amber-500" />
          Payment Recovery
        </CardTitle>
        <CardDescription>
          Track payment failure recovery rates and resolution times
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recovery Rate Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Recovery Rate</span>
            <span className="text-sm font-bold text-green-500">
              {(metrics?.recoveryRate || 0).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={metrics?.recoveryRate || 0} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            {metrics?.recovered || 0} of {metrics?.totalPastDue || 0} users recovered their subscription
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statItems.map((stat) => (
            <div 
              key={stat.label} 
              className={`p-3 rounded-lg ${stat.bgColor} border border-border/50`}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className={`text-xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Last 30 Days Summary */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Last 30 Days</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-500">
                {metrics?.last30DaysRecovered || 0}
              </div>
              <p className="text-xs text-muted-foreground">Recovered</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">
                {metrics?.last30DaysFailed || 0}
              </div>
              <p className="text-xs text-muted-foreground">Still Pending</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
