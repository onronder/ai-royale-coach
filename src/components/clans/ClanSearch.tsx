import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Trophy, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { ClanDetail } from "./ClanDetail";
import { DataLoader } from "@/components/ui/data-loader";

interface Clan {
  id: string;
  clan_tag: string;
  name: string;
  description: string | null;
  type: string | null;
  required_trophies: number;
  member_count: number;
  war_trophies: number;
  location: string | null;
}

interface ClanSearchProps {
  onSelectClan: (clan: Clan) => void;
  userPlayerTag?: string;
}

export function ClanSearch({ onSelectClan, userPlayerTag }: ClanSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [clans, setClans] = useState<Clan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);
  const [playerTag, setPlayerTag] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");

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

  const getClanTypeColor = (type: string | null) => {
    switch (type) {
      case 'open': return 'bg-green-500';
      case 'invite_only': return 'bg-yellow-500';
      case 'closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Clan Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            clans.map((clan) => (
              <Card key={clan.id} className="hover:bg-muted/50 transition-colors cursor-pointer"
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
                      <span>{clan.required_trophies}+</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span>{clan.war_trophies}</span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))
          )}

          <ClanDetail
            clan={selectedClan}
            isOpen={!!selectedClan}
            onClose={() => setSelectedClan(null)}
            playerTag={playerTag}
            playerName={playerName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
