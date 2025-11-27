import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Database, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface CacheStatus {
  playerTag: string;
  playerCachedAt: Date | null;
  battlesCachedAt: Date | null;
  isStale: boolean;
  hitCount: number;
}

interface CacheStatusIndicatorProps {
  playerTag: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function CacheStatusIndicator({ 
  playerTag, 
  onRefresh, 
  isRefreshing = false 
}: CacheStatusIndicatorProps) {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);

  useEffect(() => {
    if (!playerTag) return;

    const fetchCacheStatus = async () => {
      const normalizedTag = playerTag.replace(/^#/, '').toUpperCase();
      
      const { data } = await supabase
        .from('player_cache')
        .select('cached_at, updated_at, battles_data')
        .eq('player_tag', normalizedTag)
        .maybeSingle();

      if (data) {
        const cachedAt = new Date(data.cached_at || data.updated_at || Date.now());
        const now = new Date();
        const playerStaleThreshold = 5 * 60 * 1000; // 5 minutes
        const isStale = (now.getTime() - cachedAt.getTime()) > playerStaleThreshold;

        setCacheStatus({
          playerTag: normalizedTag,
          playerCachedAt: cachedAt,
          battlesCachedAt: data.battles_data ? cachedAt : null,
          isStale,
          hitCount: 1 // Simplified - could track in DB
        });
      } else {
        setCacheStatus(null);
      }
    };

    fetchCacheStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchCacheStatus, 30000);
    return () => clearInterval(interval);
  }, [playerTag]);

  const getStatusColor = () => {
    if (!cacheStatus) return "text-muted-foreground";
    if (cacheStatus.isStale) return "text-warning";
    return "text-success";
  };

  const getStatusIcon = () => {
    if (!cacheStatus) return <AlertCircle className="h-3.5 w-3.5" />;
    if (cacheStatus.isStale) return <Clock className="h-3.5 w-3.5" />;
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  };

  const getStatusText = () => {
    if (!cacheStatus?.playerCachedAt) return "No cache";
    return formatDistanceToNow(cacheStatus.playerCachedAt, { addSuffix: true });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-1.5 h-8 px-2 ${getStatusColor()}`}
        >
          <Database className="h-3.5 w-3.5" />
          <span className="text-xs hidden sm:inline">
            {cacheStatus ? (cacheStatus.isStale ? "Stale" : "Fresh") : "No data"}
          </span>
          {getStatusIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Data Cache Status</h4>
            <Badge variant={cacheStatus?.isStale ? "outline" : "default"} className="text-xs">
              {cacheStatus ? (cacheStatus.isStale ? "Stale" : "Fresh") : "Empty"}
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Player Data</span>
              <span className={getStatusColor()}>
                {cacheStatus?.playerCachedAt 
                  ? formatDistanceToNow(cacheStatus.playerCachedAt, { addSuffix: true })
                  : "Not cached"
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Battle History</span>
              <span className={getStatusColor()}>
                {cacheStatus?.battlesCachedAt 
                  ? formatDistanceToNow(cacheStatus.battlesCachedAt, { addSuffix: true })
                  : "Not cached"
                }
              </span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Cache reduces API calls and improves load times. Fresh data is under 5 minutes old.
            </p>
            <Button 
              onClick={onRefresh} 
              disabled={isRefreshing}
              size="sm" 
              className="w-full gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
