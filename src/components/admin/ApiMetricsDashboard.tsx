import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Activity, Clock, Database, AlertTriangle, RefreshCw, Zap, ChevronDown, Layers } from 'lucide-react';
import { useApiMetrics, EndpointGroup } from '@/hooks/useApiMetrics';
import { ApiMetricsChart } from './ApiMetricsChart';
import { ApiRequestLog } from './ApiRequestLog';

function EndpointGroupCard({ group, t }: { group: EndpointGroup; t: (key: string) => string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
          <div className="flex items-center gap-3">
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            <div>
              <span className="font-medium">{group.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({group.endpoints.length} {t('admin.apiMetrics.endpoints')})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold">{group.totalCount} {t('admin.apiMetrics.calls')}</span>
            <span className="text-muted-foreground">{group.avgDuration}ms</span>
            <span className={group.cacheHitRate >= 70 ? 'text-green-500' : group.cacheHitRate >= 40 ? 'text-yellow-500' : 'text-muted-foreground'}>
              {group.cacheHitRate}% {t('admin.apiMetrics.cache')}
            </span>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-7 mt-1 space-y-1 border-l-2 border-muted pl-3">
          {group.endpoints.map((ep) => (
            <div
              key={ep.endpoint}
              className="flex items-center justify-between p-2 rounded text-sm hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs truncate max-w-[200px]">
                  {ep.endpoint}
                </span>
                {ep.avgDuration > 500 && (
                  <Badge variant="destructive" className="text-[10px] px-1">{t('admin.apiMetrics.slow')}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{ep.count}</span>
                <span>{ep.avgDuration}ms</span>
                <span>{ep.cacheHitRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ApiMetricsDashboard() {
  const { t } = useTranslation();
  const [timeframe, setTimeframe] = useState<'15min' | '1hr' | '24hr'>('1hr');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const { stats, endpoints, endpointGroups, timeline, recentLogs, isLoading, refetch } = useApiMetrics(timeframe);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.apiMetrics.title')}</h2>
          <p className="text-muted-foreground">{t('admin.apiMetrics.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
              {t('admin.apiMetrics.totalRequests')}
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
              {t('admin.apiMetrics.requestsPerMin')}
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
              {t('admin.apiMetrics.cacheHitRate')}
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
              {t('admin.apiMetrics.avgDuration')}
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
              {t('admin.apiMetrics.slowQueries')}
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
          <CardTitle className="text-lg">{t('admin.apiMetrics.requestTimeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiMetricsChart data={timeline || []} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Endpoints Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Endpoints by Category
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grouped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grouped')}
            >
              Grouped
            </Button>
            <Button
              variant={viewMode === 'flat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('flat')}
            >
              Flat
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : viewMode === 'grouped' ? (
            <div className="space-y-2">
              {endpointGroups?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                endpointGroups?.map((group) => (
                  <EndpointGroupCard key={group.name} group={group} t={t} />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {endpoints?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                endpoints?.map((ep) => (
                  <div
                    key={ep.endpoint}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate max-w-[200px]">
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
          )}
        </CardContent>
      </Card>

      {/* Recent Requests Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiRequestLog logs={recentLogs || []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
