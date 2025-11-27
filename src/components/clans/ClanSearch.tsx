import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Trophy, Shield, Globe, Crown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { ClanDetail } from "./ClanDetail";
import { DataLoader } from "@/components/ui/data-loader";

interface Clan {
  id?: string;
  rank?: number;
  clan_tag: string;
  name: string;
  description?: string | null;
  type?: string | null;
  required_trophies?: number;
  member_count: number;
  war_trophies?: number;
  clan_score?: number;
  clan_war_trophies?: number;
  location?: string | null;
  badge_id?: number;
}

interface ClanSearchProps {
  onSelectClan: (clan: Clan) => void;
  userPlayerTag?: string;
}

export function ClanSearch({ onSelectClan, userPlayerTag }: ClanSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [clans, setClans] = useState<Clan[]>([]);
  const [globalClans, setGlobalClans] = useState<Clan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [playerTag, setPlayerTag] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    // Get player info from session or localStorage
    const getPlayerInfo = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        const tag = userPlayerTag || localStorage.getItem('player_tag') || '';
        const name = localStorage.getItem('player_name') || 'Player';
        setPlayerTag(tag);
        setPlayerName(name);
      }
    };
    getPlayerInfo();
  }, [userPlayerTag]);

  // Load global rankings when tab is selected
  useEffect(() => {
    if (activeTab === 'global' && globalClans.length === 0) {
      fetchGlobalRankings();
    }
  }, [activeTab]);

  const fetchGlobalRankings = async () => {
    setIsLoadingGlobal(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-clans', {
        body: { type: 'global_rankings' }
      });

      if (error) throw error;
      setGlobalClans(data?.clans || []);
    } catch (error) {
      console.error('Error fetching global rankings:', error);
      toast.error('Failed to load global clan rankings');
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const searchClans = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-clans', {
        body: { query: searchQuery }
      });

      if (error) throw error;
      
      setClans(data?.clans || []);
      
      if (data?.clans?.length === 0) {
        toast.info('No clans found');
      }
    } catch (error) {
      console.error('Error searching clans:', error);
      toast.error('Failed to search clans');
    } finally {
      setIsLoading(false);
    }
  };

  const getClanTypeColor = (type: string | null | undefined) => {
    switch (type) {
      case 'open': return 'bg-green-500';
      case 'invite_only': return 'bg-yellow-500';
      case 'closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    if (rank <= 10) return 'bg-primary text-primary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Clan Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Clans
            </TabsTrigger>
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Global Rankings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or #TAG..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchClans()}
              />
              <Button onClick={searchClans} disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <DataLoader context="clans" variant="inline" />
              ) : clans.length === 0 && searchQuery.trim() === "" ? (
                <EmptyState
                  icon={Search}
                  title="Find Your Perfect Clan"
                  description="Search for clans by name or tag to find the perfect match for your playstyle."
                  variant="compact"
                />
              ) : clans.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Clans Found"
                  description="Try adjusting your search criteria or explore different clan names."
                  variant="compact"
                />
              ) : (
                clans.map((clan, idx) => (
                  <Card key={clan.id || `${clan.clan_tag}-${idx}`} className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedClan(clan)}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{clan.name}</h3>
                          <p className="text-sm text-muted-foreground">{clan.clan_tag}</p>
                        </div>
                        <Badge className={`${getClanTypeColor(clan.type)} text-white`}>
                          {clan.type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>

                      {clan.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{clan.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{clan.member_count}/50</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-muted-foreground" />
                          <span>{clan.required_trophies || 0}+</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span>{clan.war_trophies || 0}</span>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="global" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Top 50 clans worldwide by trophy count
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchGlobalRankings}
                disabled={isLoadingGlobal}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingGlobal ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="space-y-2">
              {isLoadingGlobal ? (
                <DataLoader context="clans" variant="inline" />
              ) : globalClans.length === 0 ? (
                <EmptyState
                  icon={Globe}
                  title="No Rankings Available"
                  description="Unable to load global clan rankings. Try refreshing."
                  variant="compact"
                />
              ) : (
                globalClans.map((clan) => (
                  <Card 
                    key={clan.clan_tag} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedClan(clan)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadgeColor(clan.rank || 0)}`}>
                          {clan.rank === 1 ? <Crown className="w-5 h-5" /> : `#${clan.rank}`}
                        </div>

                        {/* Clan Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{clan.name}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {clan.location || 'Global'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{clan.clan_tag}</p>
                        </div>

                        {/* Stats */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-primary font-bold">
                            <Trophy className="w-4 h-4" />
                            <span>{(clan.clan_score || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{clan.member_count}/50</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <ClanDetail
          clan={selectedClan}
          isOpen={!!selectedClan}
          onClose={() => setSelectedClan(null)}
          playerTag={playerTag}
          playerName={playerName}
        />
      </CardContent>
    </Card>
  );
}
