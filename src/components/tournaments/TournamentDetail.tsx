import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataLoader } from "@/components/ui/data-loader";
import { Trophy, Users, Calendar, DollarSign, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

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
  end_date: string | null;
  _count?: { registrations: number };
}

interface TournamentDetailProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
  playerTag: string;
  playerName: string;
}

export function TournamentDetail({ tournamentId, isOpen, onClose, playerTag, playerName }: TournamentDetailProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (isOpen && tournamentId) {
      fetchTournamentDetails();
      checkRegistration();
    }
  }, [isOpen, tournamentId]);

  const fetchTournamentDetails = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        tournament_registrations(count)
      `)
      .eq('id', tournamentId)
      .single();

    if (error) {
      console.error('Error fetching tournament:', error);
      toast.error('Failed to load tournament details');
    } else if (data) {
      setTournament({
        ...data,
        _count: { registrations: data.tournament_registrations?.length || 0 }
      });
    }
    setIsLoading(false);
  };

  const checkRegistration = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    const { data } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', session.session.user.id)
      .maybeSingle();

    setIsRegistered(!!data);
  };

  const handleRegister = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('Please sign in to register');
      return;
    }

    setIsRegistering(true);
    const { error } = await supabase
      .from('tournament_registrations')
      .insert({
        tournament_id: tournamentId,
        user_id: session.session.user.id,
        player_tag: playerTag,
        player_name: playerName
      });

    if (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register for tournament');
    } else {
      toast.success('Successfully registered!');
      setIsRegistered(true);
      fetchTournamentDetails();
    }
    setIsRegistering(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Tournament Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <DataLoader context="tournament-detail" variant="inline" />
        ) : tournament ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{tournament.name}</h2>
                <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                  {tournament.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-500 font-bold text-2xl">
                  <DollarSign className="w-6 h-6" />
                  <span>{tournament.prize_pool.toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">Prize Pool</p>
              </div>
            </div>

            {tournament.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{tournament.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Participants</p>
                  <p className="font-semibold">
                    {tournament._count?.registrations || 0} / {tournament.max_participants}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Entry Fee</p>
                  <p className="font-semibold">{tournament.entry_fee} gems</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Starts</p>
                  <p className="font-semibold">
                    {formatDistanceToNow(new Date(tournament.start_date), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Trophy className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-semibold">{tournament.tournament_type.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {tournament.status === 'registration' && (
              <div className="pt-4 border-t">
                {isRegistered ? (
                  <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-500 font-semibold">You're registered!</span>
                  </div>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleRegister}
                    disabled={isRegistering || (tournament._count?.registrations || 0) >= tournament.max_participants}
                  >
                    {isRegistering ? 'Registering...' : 'Register for Tournament'}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Tournament not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
