import { useEffect, useState } from "react";
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
import { usePlayerProfiles, PlayerProfile } from "@/hooks/usePlayerProfiles";

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

export function LeaderboardView({ userClanTag, userId, currentPlayerTag }: LeaderboardViewProps) {
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clanLeaderboard, setClanLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { profiles } = usePlayerProfiles(userId || null);

  useEffect(() => {
    fetchLeaderboards();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_entries'
        },
        (payload) => {
          console.log('Leaderboard update:', payload);
          fetchLeaderboards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userClanTag]);

  const fetchLeaderboards = async () => {
    setIsLoading(true);
    
    // Fetch global top 100
    const { data: globalData, error: globalError } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .order('trophies', { ascending: false })
      .limit(100);

    if (!globalError && globalData) {
      setGlobalLeaderboard(globalData);
    }

    // Fetch clan leaderboard if user has a clan
    if (userClanTag) {
      const { data: clanData, error: clanError } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('clan_tag', userClanTag)
        .order('trophies', { ascending: false })
        .limit(50);

      if (!clanError && clanData) {
        setClanLeaderboard(clanData);
      }
    }

    setIsLoading(false);
  };

  const syncGlobalLeaderboard = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-leaderboard');
      if (error) throw error;
      
      toast.success('Global rankings synced successfully!');
      await fetchLeaderboards();
    } catch (error) {
      console.error('Error syncing leaderboard:', error);
      toast.error('Failed to sync global rankings');
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate user's estimated global rank based on trophies
  const estimateGlobalRank = (trophies: number): string => {
    // Based on trophy count, estimate ranking
    // Top 200 players are around 8500+ trophies
    // Top 1000 around 7500+
    // Top 10000 around 6500+
    // etc.
    if (trophies >= 8500) return "Top 200";
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
            Your Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profiles.map((profile) => {
              const top100Rank = isInTop100(profile.player_tag);
              const trophies = profile.trophies || 0;
              const estimatedRank = estimateGlobalRank(trophies);
              
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
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <Crown className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {profile.player_name || `#${profile.player_tag}`}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="h-3 w-3 text-primary" />
                        <span>{trophies.toLocaleString()} trophies</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {top100Rank ? (
                      <Badge className="bg-gradient-legendary text-primary-foreground animate-pulse-glow">
                        #{top100Rank} Global
                      </Badge>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          Est. Rank: {estimatedRank}
                        </p>
                        {trophies > 0 && globalLeaderboard.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {(globalLeaderboard[99]?.trophies || 0) - trophies > 0 
                              ? `${((globalLeaderboard[99]?.trophies || 0) - trophies).toLocaleString()} to Top 100`
                              : 'Close to Top 100!'
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
          title="No Leaderboard Data"
          description="Click 'Sync Global' to fetch the top 200 players worldwide"
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
                        You
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
              Global Leaderboard
            </CardTitle>
            <Button
              onClick={syncGlobalLeaderboard}
              disabled={isSyncing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Global'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global">
                <Trophy className="mr-2 h-4 w-4" />
                Top 100
              </TabsTrigger>
              <TabsTrigger value="clan" disabled={!userClanTag}>
                <Users className="mr-2 h-4 w-4" />
                {userClanTag ? 'My Clan' : 'No Clan'}
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
