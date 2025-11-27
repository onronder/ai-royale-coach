import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, TrendingUp, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { DataLoader } from "@/components/ui/data-loader";

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
}

export function LeaderboardView({ userClanTag }: LeaderboardViewProps) {
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clanLeaderboard, setClanLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const renderLeaderboard = (entries: LeaderboardEntry[]) => {
    if (isLoading) {
      return <DataLoader context="leaderboard" variant="inline" />;
    }

    if (entries.length === 0) {
      return (
        <EmptyState
          icon={Trophy}
          title="No Leaderboard Data"
          description="Sync global rankings to see the top players"
          variant="compact"
        />
      );
    }

    return (
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
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
                <p className="font-semibold truncate">{entry.player_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{entry.player_tag}</span>
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
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Leaderboard
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
              Global Top 100
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
  );
}
