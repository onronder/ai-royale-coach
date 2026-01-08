import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pause, Play, Search, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  duration_ms: number | null;
  cache_hit: boolean;
  created_at: string;
}

interface ApiRequestLogProps {
  logs: ApiLog[];
  isLoading: boolean;
}

interface DuplicateInfo {
  isDuplicate: boolean;
  count: number;
}

/**
 * Detect duplicates: same endpoint called multiple times within 1 second
 */
function detectDuplicates(logs: ApiLog[]): Map<string, DuplicateInfo> {
  const duplicateMap = new Map<string, DuplicateInfo>();
  const DUPLICATE_WINDOW_MS = 1000; // 1 second

  logs.forEach((log, index) => {
    let duplicateCount = 0;
    const logTime = new Date(log.created_at).getTime();

    // Look for other calls to same endpoint within 1 second
    logs.forEach((otherLog, otherIndex) => {
      if (index === otherIndex) return;
      if (otherLog.endpoint !== log.endpoint) return;
      
      const otherTime = new Date(otherLog.created_at).getTime();
      if (Math.abs(logTime - otherTime) <= DUPLICATE_WINDOW_MS) {
        duplicateCount++;
      }
    });

    duplicateMap.set(log.id, {
      isDuplicate: duplicateCount > 0,
      count: duplicateCount + 1, // Include self
    });
  });

  return duplicateMap;
}

export function ApiRequestLog({ logs, isLoading }: ApiRequestLogProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  const duplicateInfo = useMemo(() => detectDuplicates(logs), [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    
    if (filter) {
      result = result.filter((log) =>
        log.endpoint.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    if (showDuplicatesOnly) {
      result = result.filter((log) => duplicateInfo.get(log.id)?.isDuplicate);
    }
    
    return result;
  }, [logs, filter, showDuplicatesOnly, duplicateInfo]);

  const duplicateCount = useMemo(() => {
    return logs.filter((log) => duplicateInfo.get(log.id)?.isDuplicate).length;
  }, [logs, duplicateInfo]);

  const displayLogs = isPaused ? filteredLogs.slice(0, 50) : filteredLogs.slice(0, 30);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'SELECT':
        return 'bg-blue-500/10 text-blue-500';
      case 'INSERT':
        return 'bg-green-500/10 text-green-500';
      case 'UPDATE':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'DELETE':
        return 'bg-red-500/10 text-red-500';
      case 'EDGE':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading logs...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Duplicate Warning */}
      {duplicateCount > 0 && (
        <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{duplicateCount} duplicate calls detected (same endpoint within 1s)</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by endpoint..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button
          variant={showDuplicatesOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
          className="h-8 text-xs"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Dupes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
          className="h-8"
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </Button>
      </div>

      {/* Log List */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-1">
          {displayLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              {showDuplicatesOnly ? 'No duplicate calls detected' : 'No requests logged yet'}
            </p>
          ) : (
            displayLogs.map((log) => {
              const dupInfo = duplicateInfo.get(log.id);
              const isDupe = dupInfo?.isDuplicate;
              
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-2 p-1.5 rounded text-xs font-mono hover:bg-muted/50 ${
                    isDupe ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/30'
                  }`}
                >
                  <span className="text-muted-foreground w-[50px] shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: false })}
                  </span>
                  <Badge variant="outline" className={`${getMethodColor(log.method)} text-[10px] px-1`}>
                    {log.method}
                  </Badge>
                  <span className="truncate flex-1">{log.endpoint}</span>
                  <span className="text-muted-foreground w-[45px] text-right">
                    {log.duration_ms ?? '-'}ms
                  </span>
                  {log.cache_hit && (
                    <Badge variant="secondary" className="text-[10px] px-1">
                      CACHE
                    </Badge>
                  )}
                  {isDupe && (
                    <Badge variant="destructive" className="text-[10px] px-1">
                      x{dupInfo?.count}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

