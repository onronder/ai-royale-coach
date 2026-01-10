import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Webhook,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebhookEvent {
  id: string;
  event_type: string;
  event_id: string | null;
  status: string;
  error_message: string | null;
  payload_summary: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
  processed_at: string;
}

type StatusFilter = 'all' | 'processed' | 'failed' | 'skipped';

export function WebhookEventsPanel() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const { data: events, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['webhook-events', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WebhookEvent[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get counts for last 24 hours
      const { data: last24hData } = await supabase
        .from('webhook_events')
        .select('status')
        .gte('created_at', last24h);

      // Get counts for last 7 days
      const { data: last7dData } = await supabase
        .from('webhook_events')
        .select('status')
        .gte('created_at', last7d);

      const countByStatus = (data: { status: string }[] | null, status: string) =>
        data?.filter(e => e.status === status).length || 0;

      return {
        last24h: {
          total: last24hData?.length || 0,
          processed: countByStatus(last24hData, 'processed'),
          failed: countByStatus(last24hData, 'failed'),
          skipped: countByStatus(last24hData, 'skipped'),
        },
        last7d: {
          total: last7dData?.length || 0,
          processed: countByStatus(last7dData, 'processed'),
          failed: countByStatus(last7dData, 'failed'),
          skipped: countByStatus(last7dData, 'skipped'),
        },
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const toggleExpanded = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Processed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Skipped</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatEventType = (type: string) => {
    return type
      .replace('subscription.', '')
      .replace('checkout.', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total (24h)</CardDescription>
            <CardTitle className="text-2xl">
              {stats?.last24h.total ?? <Skeleton className="h-8 w-16" />}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Processed (24h)
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {stats?.last24h.processed ?? <Skeleton className="h-8 w-16" />}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              Failed (24h)
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {stats?.last24h.failed ?? <Skeleton className="h-8 w-16" />}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
              Skipped (24h)
            </CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {stats?.last24h.skipped ?? <Skeleton className="h-8 w-16" />}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <CardTitle>Webhook Events</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Recent Polar webhook events and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="processed">Processed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="skipped">Skipped</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : events?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No webhook events found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events?.map((event) => (
                      <div
                        key={event.id}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleExpanded(event.id)}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(event.status)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {formatEventType(event.event_type)}
                                </span>
                                {getStatusBadge(event.status)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                {event.user_id && (
                                  <span className="ml-2">• User: {event.user_id.slice(0, 8)}...</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            {expandedEvents.has(event.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {expandedEvents.has(event.id) && (
                          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-muted-foreground">Event ID:</span>
                                <span className="ml-2 font-mono text-xs">{event.event_id || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Processed:</span>
                                <span className="ml-2">
                                  {new Date(event.processed_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            {event.error_message && (
                              <div className="bg-destructive/10 border border-destructive/30 rounded p-2 mt-2">
                                <span className="text-destructive font-medium">Error: </span>
                                <span className="text-destructive/90">{event.error_message}</span>
                              </div>
                            )}

                            {event.payload_summary && (
                              <div className="bg-muted rounded p-2 mt-2">
                                <span className="text-muted-foreground font-medium">Payload Summary:</span>
                                <pre className="mt-1 text-xs overflow-x-auto">
                                  {JSON.stringify(event.payload_summary, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 7-Day Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">7-Day Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.last7d.total ?? '-'}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.last7d.processed ?? '-'}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats?.last7d.failed ?? '-'}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats?.last7d.skipped ?? '-'}</div>
              <div className="text-sm text-muted-foreground">Skipped</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
