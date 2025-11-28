import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, TrendingUp, RefreshCw, Crown, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { DataLoader } from "@/components/ui/data-loader";
import { usePlayerProfiles, PlayerProfile, getClanBadgeUrl } from "@/hooks/usePlayerProfiles";

interface LeaderboardEntry {
  id: string;
  player_tag: string;
  player_name: string;
  trophies: number;
  clan_tag: string | null;
  clan_name: string | null;
  arena_name: string | null;
  last_synced_at: string;
}

interface LeaderboardViewProps {
  userClanTag?: string | null;
  userId?: string;
  currentPlayerTag?: string;
}

/**
 * LeaderboardView - realtime handled by useUnifiedRealtime
 */
export function LeaderboardView({ userClanTag, userId, currentPlayerTag }: LeaderboardViewProps) {
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { profiles } = usePlayerProfiles(userId || null);

  // Use React Query - realtime invalidation handled by useUnifiedRealtime
  const { data: globalLeaderboard = [], isLoading: isLoadingGlobal, refetch: refetchGlobal } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .order('trophies', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
  });

  const { data: clanLeaderboard = [], isLoading: isLoadingClan } = useQuery({
    queryKey: ['leaderboard', 'clan', userClanTag],
    queryFn: async () => {
      if (!userClanTag) return [];
      
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('clan_tag', userClanTag)
        .order('trophies', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
    enabled: !!userClanTag,
  });

  const isLoading = isLoadingGlobal || isLoadingClan;

  const syncGlobalLeaderboard = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-leaderboard');
      if (error) throw error;
      
      toast.success(t('leaderboard.syncSuccess'));
      await refetchGlobal();
    } catch (error) {
      console.error('Error syncing leaderboard:', error);
      toast.error(t('leaderboard.syncFailed'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate user's estimated global rank based on trophies
  const estimateGlobalRank = (trophies: number): string => {
    if (trophies >= 8500) return t('leaderboard.rankTop200');
    if (trophies >= 8000) return "~500";
    if (trophies >= 7500) return "~1,000";
    if (trophies >= 7000) return "~5,000";
    if (trophies >= 6500) return "~10,000";
    if (trophies >= 6000) return "~50,000";
    if (trophies >= 5500) return "~100,000";
    if (trophies >= 5000) return "~250,000";
    if (trophies >= 4500) return "~500,000";
    return ">1,000,000";
  };

  // Check if a player tag is in top 100
  const isInTop100 = (playerTag: string): number | null => {
    const normalizedTag = playerTag.replace('#', '').toUpperCase();
    const index = globalLeaderboard.findIndex(
      e => e.player_tag.replace('#', '').toUpperCase() === normalizedTag
    );
    return index >= 0 ? index + 1 : null;
  };

  const renderUserRankings = () => {
    if (!profiles || profiles.length === 0) return null;

    return (
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            {t('leaderboard.yourRankings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profiles.map((profile) => {
              const top100Rank = isInTop100(profile.player_tag);
              const trophies = profile.trophies || 0;
              const estimatedRank = estimateGlobalRank(trophies);
              const badgeUrl = getClanBadgeUrl(profile.clan_badge_id);
              
              return (
                <div
                  key={profile.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    profile.player_tag === currentPlayerTag?.replace('#', '').toUpperCase()
                      ? 'bg-primary/20 border border-primary/40'
                      : 'bg-card/50 hover:bg-card/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center overflow-hidden">
                      {badgeUrl ? (
                        <img 
                          src={badgeUrl} 
                          alt={t('leaderboard.clanBadge')}
                          className="w-7 h-7 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Crown className="h-5 w-5 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {profile.player_name || `#${profile.player_tag}`}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="h-3 w-3 text-primary" />
                        <span>{trophies.toLocaleString()} {t('leaderboard.trophies')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {top100Rank ? (
                      <Badge className="bg-gradient-legendary text-primary-foreground animate-pulse-glow">
                        {t('leaderboard.globalRank', { rank: top100Rank })}
                      </Badge>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          {t('leaderboard.estRank', { rank: estimatedRank })}
                        </p>
                        {trophies > 0 && globalLeaderboard.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {(globalLeaderboard[99]?.trophies || 0) - trophies > 0 
                              ? `${((globalLeaderboard[99]?.trophies || 0) - trophies).toLocaleString()} ${t('leaderboard.toTop100')}`
                              : t('leaderboard.closeToTop100')
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLeaderboard = (entries: LeaderboardEntry[]) => {
    if (isLoading) {
      return <DataLoader context="leaderboard" variant="inline" />;
    }

    if (entries.length === 0) {
      return (
        <EmptyState
          icon={Trophy}
          title={t('leaderboard.noData')}
          description={t('leaderboard.noDataDescription')}
          variant="compact"
        />
      );
    }

    return (
      <div className="space-y-2">
        {entries.map((entry, index) => {
          // Check if this entry is one of the user's accounts
          const isUserAccount = profiles.some(
            p => p.player_tag === entry.player_tag.replace('#', '').toUpperCase()
          );
          
          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                isUserAccount 
                  ? 'bg-primary/20 border-2 border-primary/50 shadow-glow' 
                  : 'bg-card border border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  {index < 3 ? (
                    <Badge 
                      variant="default" 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        index === 0 ? 'bg-yellow-500 hover:bg-yellow-600' :
                        index === 1 ? 'bg-gray-400 hover:bg-gray-500' :
                        'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      {index + 1}
                    </Badge>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{entry.player_name}</p>
                    {isUserAccount && (
                      <Badge variant="secondary" className="text-xs">
                        {t('leaderboard.you')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate font-mono">{entry.player_tag}</span>
                    {entry.arena_name && (
                      <>
                        <span>•</span>
                        <span className="truncate">{entry.arena_name}</span>
                      </>
                    )}
                  </div>
                  {entry.clan_name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Users className="w-3 h-3" />
                      <span className="truncate">{entry.clan_name}</span>
                    </div>
                  )}
                </div>

                {/* Trophies */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <Trophy className="w-5 h-5" />
                    <span className="text-xl">{entry.trophies.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.last_synced_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* User Rankings Section */}
      {renderUserRankings()}
      
      {/* Main Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('leaderboard.globalLeaderboard')}
            </CardTitle>
            <Button
              onClick={syncGlobalLeaderboard}
              disabled={isSyncing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? t('leaderboard.syncing') : t('leaderboard.syncGlobal')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global">
                <Trophy className="mr-2 h-4 w-4" />
                {t('leaderboard.top100')}
              </TabsTrigger>
              <TabsTrigger value="clan" disabled={!userClanTag}>
                <Users className="mr-2 h-4 w-4" />
                {userClanTag ? t('leaderboard.myClan') : t('leaderboard.noClan')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="mt-4">
              {renderLeaderboard(globalLeaderboard)}
            </TabsContent>

            <TabsContent value="clan" className="mt-4">
              {renderLeaderboard(clanLeaderboard)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
