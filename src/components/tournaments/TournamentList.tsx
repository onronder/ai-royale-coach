import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Calendar, DollarSign, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateTournamentForm } from "./CreateTournamentForm";
import { TournamentDetail } from "./TournamentDetail";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  prize_pool: number;
  entry_fee: number;
  max_participants: number;
  tournament_type: string;
  status: string;
  start_date: string;
  _count?: { registrations: number };
}

export function TournamentList({ onSelectTournament }: { onSelectTournament: (id: string) => void }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [playerTag, setPlayerTag] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");

  useEffect(() => {
    // Get player info from session or localStorage
    const getPlayerInfo = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        const tag = localStorage.getItem('player_tag') || '';
        const name = localStorage.getItem('player_name') || 'Player';
        setPlayerTag(tag);
        setPlayerName(name);
      }
    };
    getPlayerInfo();
  }, []);

  useEffect(() => {
    fetchTournaments();

    const channel = supabase
      .channel('tournament-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments'
      }, () => {
        fetchTournaments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        tournament_registrations(count)
      `)
      .order('start_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Failed to load tournaments');
    } else if (data) {
      setTournaments(data.map(t => ({
        ...t,
        _count: { registrations: t.tournament_registrations?.length || 0 }
      })));
    }
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showCreateForm && (
        <CreateTournamentForm 
          onSuccess={() => {
            setShowCreateForm(false);
            fetchTournaments();
          }} 
        />
      )}

      {tournaments.length === 0 && !isLoading && !showCreateForm && (
        <EmptyState
          icon={Trophy}
          title="No Tournaments Yet"
          description="Create your first tournament to get players competing!"
          variant="compact"
        />
      )}

      {!showCreateForm && tournaments.length === 0 && !isLoading && (
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Tournament
        </Button>
      )}

      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setSelectedTournamentId(tournament.id)}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  {tournament.name}
                </CardTitle>
                <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                  {tournament.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-500 font-bold">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xl">{tournament.prize_pool.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Prize Pool</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournament.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{tournament.description}</p>
            )}
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{tournament._count?.registrations || 0} / {tournament.max_participants}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDistanceToNow(new Date(tournament.start_date), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <span>{tournament.tournament_type.replace('_', ' ')}</span>
              </div>
            </div>

            <Button className="w-full mt-2" variant="outline">
              View Details
            </Button>
          </CardContent>
        </Card>
      ))}

      <TournamentDetail
        tournamentId={selectedTournamentId || ""}
        isOpen={!!selectedTournamentId}
        onClose={() => setSelectedTournamentId(null)}
        playerTag={playerTag}
        playerName={playerName}
      />

    </div>
  );
}
