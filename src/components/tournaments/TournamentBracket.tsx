import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataLoader } from "@/components/ui/data-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy, Swords, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BracketMatch {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  status: string;
  completed_at: string | null;
}

interface Registration {
  id: string;
  player_name: string;
  player_tag: string;
}

interface TournamentBracketProps {
  tournamentId: string;
  tournamentStatus: string;
}

export function TournamentBracket({ tournamentId, tournamentStatus }: TournamentBracketProps) {
  const { t } = useTranslation();

  const { data: brackets = [], isLoading: isLoadingBrackets } = useQuery({
    queryKey: ['tournament-brackets', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_brackets')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      return data as BracketMatch[];
    },
    enabled: !!tournamentId,
  });

  const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['tournament-registrations', tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('id, player_name, player_tag')
        .eq('tournament_id', tournamentId);

      if (error) throw error;
      return data as Registration[];
    },
    enabled: !!tournamentId,
  });

  const isLoading = isLoadingBrackets || isLoadingRegistrations;

  if (isLoading) {
    return <DataLoader context="tournament-bracket" variant="inline" />;
  }

  if (tournamentStatus === 'registration') {
    return (
      <EmptyState
        icon={Swords}
        title={t('tournaments.bracketNotReady')}
        description={t('tournaments.bracketWaitingForStart')}
        variant="compact"
      />
    );
  }

  if (brackets.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={t('tournaments.noBrackets')}
        description={t('tournaments.noBracketsDescription')}
        variant="compact"
      />
    );
  }

  // Group brackets by round
  const rounds = brackets.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, BracketMatch[]>);

  const getPlayerName = (playerId: string | null): string => {
    if (!playerId) return t('tournaments.tbd');
    const reg = registrations.find(r => r.id === playerId);
    return reg?.player_name || t('tournaments.unknown');
  };

  const getPlayerTag = (playerId: string | null): string => {
    if (!playerId) return '';
    const reg = registrations.find(r => r.id === playerId);
    return reg?.player_tag || '';
  };

  const totalRounds = Object.keys(rounds).length;
  const getRoundName = (round: number): string => {
    if (round === totalRounds) return t('tournaments.final');
    if (round === totalRounds - 1) return t('tournaments.semiFinal');
    if (round === totalRounds - 2) return t('tournaments.quarterFinal');
    return t('tournaments.round', { round });
  };

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-xs">{t('tournaments.completed')}</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-yellow-500 text-xs animate-pulse">{t('tournaments.inProgress')}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{t('tournaments.pending')}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          {t('tournaments.bracket')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {Object.entries(rounds)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([roundNum, matches]) => (
                <div key={roundNum} className="flex flex-col gap-4 min-w-[240px]">
                  {/* Round Header */}
                  <div className="text-center pb-2 border-b border-border/50">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {getRoundName(Number(roundNum))}
                    </h3>
                  </div>

                  {/* Matches */}
                  <div className="flex flex-col gap-4 justify-around flex-1">
                    {matches.map((match) => {
                      const isPlayer1Winner = match.winner_id === match.player1_id;
                      const isPlayer2Winner = match.winner_id === match.player2_id;
                      const isCompleted = match.status === 'completed';

                      return (
                        <div
                          key={match.id}
                          className={cn(
                            "bg-card border rounded-lg overflow-hidden transition-all",
                            match.status === 'in_progress' && "border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]",
                            isCompleted && "border-green-500/30"
                          )}
                        >
                          {/* Match Header */}
                          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
                            <span className="text-xs text-muted-foreground">
                              {t('tournaments.match')} {match.match_number}
                            </span>
                            {getMatchStatusBadge(match.status)}
                          </div>

                          {/* Player 1 */}
                          <div
                            className={cn(
                              "flex items-center justify-between px-3 py-2.5 border-b border-border/30",
                              isPlayer1Winner && "bg-green-500/10"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isPlayer1Winner && (
                                <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className={cn(
                                  "font-medium truncate text-sm",
                                  !match.player1_id && "text-muted-foreground italic"
                                )}>
                                  {getPlayerName(match.player1_id)}
                                </p>
                                {getPlayerTag(match.player1_id) && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    #{getPlayerTag(match.player1_id)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isCompleted && (
                              <span className={cn(
                                "text-lg font-bold tabular-nums",
                                isPlayer1Winner ? "text-green-500" : "text-muted-foreground"
                              )}>
                                {match.player1_score ?? 0}
                              </span>
                            )}
                          </div>

                          {/* Player 2 */}
                          <div
                            className={cn(
                              "flex items-center justify-between px-3 py-2.5",
                              isPlayer2Winner && "bg-green-500/10"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isPlayer2Winner && (
                                <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className={cn(
                                  "font-medium truncate text-sm",
                                  !match.player2_id && "text-muted-foreground italic"
                                )}>
                                  {getPlayerName(match.player2_id)}
                                </p>
                                {getPlayerTag(match.player2_id) && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    #{getPlayerTag(match.player2_id)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isCompleted && (
                              <span className={cn(
                                "text-lg font-bold tabular-nums",
                                isPlayer2Winner ? "text-green-500" : "text-muted-foreground"
                              )}>
                                {match.player2_score ?? 0}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* Winner Display */}
            {tournamentStatus === 'completed' && brackets.length > 0 && (
              <div className="flex flex-col gap-4 min-w-[200px]">
                <div className="text-center pb-2 border-b border-border/50">
                  <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                    {t('tournaments.champion')}
                  </h3>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  {(() => {
                    const finalMatch = brackets.find(
                      b => b.round_number === totalRounds && b.winner_id
                    );
                    if (!finalMatch?.winner_id) return null;

                    return (
                      <div className="text-center p-4 bg-gradient-to-br from-yellow-500/20 to-primary/20 rounded-lg border border-yellow-500/40">
                        <Medal className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                        <p className="font-bold text-lg">
                          {getPlayerName(finalMatch.winner_id)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          #{getPlayerTag(finalMatch.winner_id)}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
