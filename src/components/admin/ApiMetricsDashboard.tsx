import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Clock, Database, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { useApiMetrics } from '@/hooks/useApiMetrics';
import { ApiMetricsChart } from './ApiMetricsChart';
import { ApiRequestLog } from './ApiRequestLog';

export function ApiMetricsDashboard() {
  const [timeframe, setTimeframe] = useState<'15min' | '1hr' | '24hr'>('1hr');
  const { stats, endpoints, timeline, recentLogs, isLoading, refetch } = useApiMetrics(timeframe);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Metrics</h2>
          <p className="text-muted-foreground">Monitor query frequency and identify redundant calls</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
            <TabsList>
              <TabsTrigger value="15min">15m</TabsTrigger>
              <TabsTrigger value="1hr">1h</TabsTrigger>
              <TabsTrigger value="24hr">24h</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              Total Requests
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoading ? '...' : stats?.totalRequests.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4" />
              Requests/min
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoading ? '...' : stats?.requestsPerMinute.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Database className="h-4 w-4" />
              Cache Hit Rate
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoading ? '...' : `${stats?.cacheHitRate.toFixed(0)}%`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Avg Duration
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoading ? '...' : `${stats?.avgDuration.toFixed(0)}ms`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4" />
              Slow Queries
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoading ? '...' : stats?.slowQueries}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiMetricsChart data={timeline || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : endpoints?.length === 0 ? (
                <p className="text-muted-foreground">No data yet</p>
              ) : (
                endpoints?.map((ep) => (
                  <div
                    key={ep.endpoint}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate max-w-[150px]">
                        {ep.endpoint}
                      </span>
                      {ep.avgDuration > 500 && (
                        <Badge variant="destructive" className="text-xs">Slow</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{ep.count} calls</span>
                      <span>{ep.avgDuration}ms</span>
                      <span>{ep.cacheHitRate}% cache</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Request Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <ApiRequestLog logs={recentLogs || []} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
