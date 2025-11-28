import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Database, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, tr, es, ptBR, fr } from "date-fns/locale";
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

const getDateLocale = (lang: string) => {
  switch (lang) {
    case 'tr': return tr;
    case 'es': return es;
    case 'pt': return ptBR;
    case 'fr': return fr;
    default: return enUS;
  }
};

export function CacheStatusIndicator({ 
  playerTag, 
  onRefresh, 
  isRefreshing = false 
}: CacheStatusIndicatorProps) {
  const { t, i18n } = useTranslation();
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const dateLocale = getDateLocale(i18n.language);

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
          hitCount: 1
        });
      } else {
        setCacheStatus(null);
      }
    };

    fetchCacheStatus();
    
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
    if (!cacheStatus) return t('cacheStatus.noData');
    return cacheStatus.isStale ? t('cacheStatus.stale') : t('cacheStatus.fresh');
  };

  const getBadgeText = () => {
    if (isRefreshing) return t('cacheStatus.syncing');
    if (!cacheStatus) return t('cacheStatus.empty');
    return cacheStatus.isStale ? t('cacheStatus.stale') : t('cacheStatus.fresh');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-1.5 h-8 px-2 ${isRefreshing ? 'text-accent animate-pulse' : getStatusColor()}`}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs hidden sm:inline">{t('cacheStatus.syncing')}</span>
            </>
          ) : (
            <>
              <Database className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">{getStatusText()}</span>
              {getStatusIcon()}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{t('cacheStatus.title')}</h4>
            <Badge variant={cacheStatus?.isStale ? "outline" : "default"} className="text-xs">
              {getBadgeText()}
            </Badge>
          </div>
          
          {isRefreshing && (
            <div className="bg-accent/10 border border-accent/20 rounded-md p-3">
              <div className="flex items-center gap-2 text-accent">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">{t('cacheStatus.syncingWithCR')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('cacheStatus.fetchingData')}
              </p>
            </div>
          )}
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('cacheStatus.playerData')}</span>
              <span className={getStatusColor()}>
                {cacheStatus?.playerCachedAt 
                  ? formatDistanceToNow(cacheStatus.playerCachedAt, { addSuffix: true, locale: dateLocale })
                  : t('cacheStatus.notCached')
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('cacheStatus.battleHistory')}</span>
              <span className={getStatusColor()}>
                {cacheStatus?.battlesCachedAt 
                  ? formatDistanceToNow(cacheStatus.battlesCachedAt, { addSuffix: true, locale: dateLocale })
                  : t('cacheStatus.notCached')
                }
              </span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              {isRefreshing 
                ? t('cacheStatus.waitMessage')
                : t('cacheStatus.cacheInfo')
              }
            </p>
            <Button 
              onClick={onRefresh} 
              disabled={isRefreshing}
              size="sm" 
              className="w-full gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('cacheStatus.syncing') : t('cacheStatus.refreshData')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
