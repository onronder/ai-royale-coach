import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  UserX, 
  Clock, 
  Crown, 
  AlertCircle,
  RefreshCw,
  Mail,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface UserSubscriptionStatus {
  id: string;
  email: string | null;
  created_at: string | null;
  trial_ends_at: string | null;
  trial_used: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
  account_slots: number | null;
}

/**
 * Admin panel showing all users blocked (without active subscription)
 */
export function BlockedUsersPanel() {
  const { t } = useTranslation();
  
  const { data: users, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-blocked-users'],
    queryFn: async () => {
      // Get all profiles with their subscription status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at, trial_ends_at, trial_used')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Failed to fetch profiles:', profilesError);
        return [];
      }
      
      // Get all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, status, current_period_end, account_slots');
      
      if (subsError) {
        console.error('Failed to fetch subscriptions:', subsError);
      }
      
      // Create a map of subscriptions by user_id
      const subsMap = new Map(
        (subscriptions || []).map(sub => [sub.user_id, sub])
      );
      
      // Combine profiles with subscription status
      const combinedUsers: UserSubscriptionStatus[] = (profiles || []).map(profile => {
        const sub = subsMap.get(profile.id);
        return {
          id: profile.id,
          email: profile.email,
          created_at: profile.created_at,
          trial_ends_at: profile.trial_ends_at,
          trial_used: profile.trial_used,
          subscription_status: sub?.status || null,
          current_period_end: sub?.current_period_end || null,
          account_slots: sub?.account_slots || null,
        };
      });
      
      return combinedUsers;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Categorize users
  const now = new Date();
  
  // Helper to check if user has active grace period
  const hasActiveGracePeriod = (u: UserSubscriptionStatus) => 
    u.trial_ends_at && !u.trial_used && new Date(u.trial_ends_at) > now;
  
  const activeSubscribers = users?.filter(u => 
    u.subscription_status === 'active' || 
    (u.subscription_status === 'cancelled' && u.current_period_end && new Date(u.current_period_end) > now)
  ) || [];
  
  const trialingUsers = users?.filter(u => 
    u.subscription_status === 'trialing'
  ) || [];
  
  // Past due users (payment failed)
  const pastDueUsers = users?.filter(u => 
    u.subscription_status === 'past_due'
  ) || [];
  
  // Grace period users (one-time migration fix)
  const gracePeriodUsers = users?.filter(u => {
    const hasActiveSubscription = u.subscription_status === 'active' || 
      u.subscription_status === 'trialing' ||
      u.subscription_status === 'past_due' ||
      (u.subscription_status === 'cancelled' && u.current_period_end && new Date(u.current_period_end) > now);
    return !hasActiveSubscription && hasActiveGracePeriod(u);
  }) || [];
  
  const blockedUsers = users?.filter(u => {
    // No subscription or expired subscription
    const hasActiveSubscription = u.subscription_status === 'active' || 
      u.subscription_status === 'trialing' ||
      u.subscription_status === 'past_due' ||
      (u.subscription_status === 'cancelled' && u.current_period_end && new Date(u.current_period_end) > now);
    // Also exclude grace period users from blocked
    return !hasActiveSubscription && !hasActiveGracePeriod(u);
  }) || [];

  const getStatusBadge = (user: UserSubscriptionStatus) => {
    if (user.subscription_status === 'active') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
    }
    if (user.subscription_status === 'trialing') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Trialing</Badge>;
    }
    if (user.subscription_status === 'past_due') {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Past Due</Badge>;
    }
    if (user.subscription_status === 'cancelled') {
      if (user.current_period_end && new Date(user.current_period_end) > now) {
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Cancelled (Active)</Badge>;
      }
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>;
    }
    // Check for grace period users (one-time migration)
    if (user.trial_ends_at && !user.trial_used) {
      const trialEnd = new Date(user.trial_ends_at);
      if (trialEnd > now) {
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Grace Period</Badge>;
      }
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Grace Expired</Badge>;
    }
    if (user.trial_used) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Trial Used</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">No Subscription</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscribers
            </CardTitle>
            <Crown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeSubscribers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On Trial
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{trialingUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Past Due
            </CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pastDueUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Grace Period
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{gracePeriodUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blocked Users
            </CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{blockedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Blocked Users List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              Blocked Users (No Active Subscription)
            </CardTitle>
            <CardDescription>
              Users who cannot access protected routes
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {blockedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No blocked users</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {blockedUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <UserX className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.email || 'No email'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'Unknown'}
                      </p>
                      {user.trial_ends_at && !user.trial_used && (
                        <p className="text-xs text-muted-foreground">
                          Grace period {new Date(user.trial_ends_at) > now ? 'ends' : 'ended'} {format(new Date(user.trial_ends_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(user)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Due Users List */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-500" />
            Past Due (Payment Failed)
          </CardTitle>
          <CardDescription>
            Users whose payment failed - they received an email to update their payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pastDueUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No users with failed payments</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pastDueUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 transition-colors border border-amber-500/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.email || 'No email'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'Unknown'}
                      </p>
                      {user.current_period_end && (
                        <p className="text-xs text-amber-400">
                          Period ends {format(new Date(user.current_period_end), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(user)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-gold" />
            Active Subscribers & Trialing Users
          </CardTitle>
          <CardDescription>
            Users with access to protected routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {[...activeSubscribers, ...trialingUsers, ...gracePeriodUsers].length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active subscribers</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {[...activeSubscribers, ...trialingUsers, ...gracePeriodUsers].map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Crown className="h-4 w-4 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.email || 'No email'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.account_slots ? (
                          <>
                            {user.account_slots} account slot{user.account_slots !== 1 ? 's' : ''}
                            {user.current_period_end && (
                              <> • {user.subscription_status === 'cancelled' ? 'Ends' : 'Renews'} {format(new Date(user.current_period_end), 'MMM d, yyyy')}</>
                            )}
                          </>
                        ) : user.trial_ends_at && !user.trial_used ? (
                          <>Grace period ends {format(new Date(user.trial_ends_at), 'MMM d, yyyy')}</>
                        ) : (
                          'No subscription details'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(user)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
