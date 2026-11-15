import { getDateLocale } from "@/i18n/dateLocale";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, DollarSign, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateTournamentForm } from "./CreateTournamentForm";
import { TournamentDetail } from "./TournamentDetail";
import { DataLoader } from "@/components/ui/data-loader";

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

/**
 * TournamentList - realtime handled by useUnifiedRealtime
 */
export function TournamentList({ playerTag, playerName }: { playerTag: string; playerName: string }) {
  const { t, i18n } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  // Use React Query - realtime invalidation handled by useUnifiedRealtime
  const { data: tournaments = [], isLoading, refetch } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_registrations(count)
        `)
        .order('start_date', { ascending: false })
        .limit(20);

      if (error) {
        toast.error(t('tournaments.loadFailed'));
        throw error;
      }
      
      return (data || []).map(t => ({
        ...t,
        _count: { registrations: t.tournament_registrations?.[0]?.count ?? 0 }
      })) as Tournament[];
    },
  });

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
    return <DataLoader context="tournaments" variant="card" />;
  }

  return (
    <div className="space-y-4">
      {showCreateForm && (
        <CreateTournamentForm onCancel={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            refetch();
          }} 
        />
      )}

      {tournaments.length === 0 && !isLoading && !showCreateForm && (
        <EmptyState
          icon={Trophy}
          title={t('tournaments.noTournaments')}
          description={t('tournaments.createFirst')}
          variant="compact"
        />
      )}

      {!showCreateForm && (
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('tournaments.create')}
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
                  {t(`tournaments.${tournament.status === 'in_progress' ? 'inProgress' : tournament.status}`, { defaultValue: t('common.unknown') })}
                </Badge>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-500 font-bold">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xl">{tournament.prize_pool.toLocaleString(i18n.language)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('tournaments.prizePool')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournament.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{tournament.description}</p>
            )}
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{tournament._count?.registrations || 0} / {tournament.max_participants}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDistanceToNow(new Date(tournament.start_date), { addSuffix: true, locale: getDateLocale(i18n.language) })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <span>{t(`tournaments.formats.${tournament.tournament_type}`, { defaultValue: t('common.unknown') })}</span>
              </div>
            </div>

            <Button className="w-full mt-2" variant="outline">
              {t('common.viewDetails')}
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
