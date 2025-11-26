import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Trophy, Target, MessageSquare, Swords, Crown, Users, TrendingUp, Sparkles, Award, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useClashRoyalePlayer } from "@/hooks/useClashRoyalePlayer";
import { useClashRoyaleBattles } from "@/hooks/useClashRoyaleBattles";
import { usePlayerAnalysis } from "@/hooks/usePlayerAnalysis";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { MatchCard } from "@/components/matches/MatchCard";
import { MatchDetailView } from "@/components/matches/MatchDetailView";
import { DeckAnalysisPanel } from "@/components/deck/DeckAnalysisPanel";
import { StatCard } from "@/components/stats/StatCard";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { CardCollectionTracker } from "@/components/cards/CardCollectionTracker";
import { TournamentList } from "@/components/tournaments/TournamentList";
import { ClanSearch } from "@/components/clans/ClanSearch";
import { DeckBuilder } from "@/components/deck/DeckBuilder";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";

const Dashboard = () => {
  const { playerTag } = useParams<{ playerTag: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedBattle, setSelectedBattle] = useState<ClashRoyaleBattle | null>(null);
  const [matchDetailOpen, setMatchDetailOpen] = useState(false);
  
  const { data: player, isLoading: playerLoading, error: playerError } = useClashRoyalePlayer(playerTag || null);
  const { data: battles, isLoading: battlesLoading, error: battlesError } = useClashRoyaleBattles(playerTag || null);
  const { data: analysis, isLoading: analysisLoading, error: analysisError } = usePlayerAnalysis(player, battles);

  const handleMatchClick = (battle: ClashRoyaleBattle) => {
    setSelectedBattle(battle);
    setMatchDetailOpen(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  if (!playerTag || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">AI Royal</h1>
            <p className="text-sm text-muted-foreground">Player: {playerTag}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-9 text-xs">
            <TabsTrigger value="overview">
              <Trophy className="mr-1 h-3 w-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Swords className="mr-1 h-3 w-3" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="deck">
              <Target className="mr-1 h-3 w-3" />
              Deck
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <TrendingUp className="mr-1 h-3 w-3" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="collection">
              <Sparkles className="mr-1 h-3 w-3" />
              Cards
            </TabsTrigger>
            <TabsTrigger value="tournaments">
              <Award className="mr-1 h-3 w-3" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="clans">
              <UserPlus className="mr-1 h-3 w-3" />
              Clans
            </TabsTrigger>
            <TabsTrigger value="builder">
              <Wrench className="mr-1 h-3 w-3" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="coach">
              <MessageSquare className="mr-1 h-3 w-3" />
              Coach
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-4">
                {playerLoading ? (
                  <>
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                  </>
                ) : player ? (
                  <>
                    <StatCard
                      title="Current Trophies"
                      value={player.trophies.toLocaleString()}
                      icon={Trophy}
                      description={`Best: ${player.bestTrophies.toLocaleString()}`}
                      trend="neutral"
                    />
                    <StatCard
                      title="Arena"
                      value={player.arena?.name.split(' ')[0] || 'Unknown'}
                      icon={Crown}
                      description={player.arena?.name || ''}
                    />
                    <StatCard
                      title="Win Rate"
                      value={battles ? `${((battles.filter(b => {
                        const playerTeam = b.team.find(p => p.tag === playerTag);
                        return playerTeam && playerTeam.crowns > (b.opponent[0]?.crowns || 0);
                      }).length / battles.length) * 100).toFixed(1)}%` : 'N/A'}
                      icon={Swords}
                      description="Last 25 battles"
                      trend={battles && (battles.filter(b => {
                        const playerTeam = b.team.find(p => p.tag === playerTag);
                        return playerTeam && playerTeam.crowns > (b.opponent[0]?.crowns || 0);
                      }).length / battles.length) >= 0.5 ? 'up' : 'down'}
                    />
                    <StatCard
                      title="Clan"
                      value={player.clan?.name.split(' ')[0] || 'No Clan'}
                      icon={Users}
                      description={player.clan?.name || 'Join a clan'}
                    />
                  </>
                ) : null}
              </div>

              {/* AI Analysis Card */}
              <Card className="bg-gradient-primary shadow-glow">
                <CardHeader>
                  <CardTitle className="text-primary-foreground">AI Coach Summary</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    Your personalized performance analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-primary-foreground">
                  {analysisLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full bg-primary-foreground/20" />
                      <Skeleton className="h-4 w-5/6 bg-primary-foreground/20" />
                      <Skeleton className="h-4 w-4/6 bg-primary-foreground/20" />
                    </div>
                  ) : analysisError ? (
                    <p className="text-sm">Unable to generate analysis. Please try again later.</p>
                  ) : analysis ? (
                    <div className="space-y-4">
                      <div className="prose prose-sm prose-invert max-w-none">
                        <p className="text-sm whitespace-pre-wrap">{analysis.analysis}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-primary-foreground/20">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{analysis.stats.winRate}%</p>
                          <p className="text-xs opacity-80">Win Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {parseFloat(analysis.stats.avgTrophyChange) >= 0 ? '+' : ''}{analysis.stats.avgTrophyChange}
                          </p>
                          <p className="text-xs opacity-80">Avg Trophy Δ</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Match History</CardTitle>
                  <CardDescription>Click on a match to view detailed analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {battlesLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : battlesError ? (
                    <p className="text-muted-foreground">Failed to load battles</p>
                  ) : battles && battles.length > 0 ? (
                    <div className="space-y-3">
                      {battles.slice(0, 15).map((battle, idx) => (
                        <MatchCard
                          key={idx}
                          battle={battle}
                          playerTag={playerTag!}
                          onClick={() => handleMatchClick(battle)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No battles found</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <MatchDetailView
              battle={selectedBattle}
              playerTag={playerTag!}
              open={matchDetailOpen}
              onOpenChange={setMatchDetailOpen}
            />
          </TabsContent>

          <TabsContent value="deck" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Deck</CardTitle>
                  <CardDescription>Your active battle deck with card images</CardDescription>
                </CardHeader>
                <CardContent>
                  {playerLoading ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                      ))}
                    </div>
                  ) : playerError ? (
                    <p className="text-muted-foreground">Failed to load deck</p>
                  ) : player?.currentDeck && player.currentDeck.length > 0 ? (
                    <DeckGrid cards={player.currentDeck} showElixir={true} size="md" />
                  ) : (
                    <p className="text-muted-foreground">No deck data available</p>
                  )}
                </CardContent>
              </Card>

              {player && battles && battles.length > 0 && (
                <DeckAnalysisPanel player={player} battles={battles} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="collection" className="mt-6">
            {user && playerTag && (
              <CardCollectionTracker 
                playerTag={playerTag} 
                userId={user.id}
              />
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <LeaderboardView userClanTag={player?.clan?.tag} />
          </TabsContent>

          <TabsContent value="tournaments" className="mt-6">
            <TournamentList onSelectTournament={(id) => console.log('Tournament:', id)} />
          </TabsContent>

          <TabsContent value="clans" className="mt-6">
            <ClanSearch 
              onSelectClan={(clan) => console.log('Clan:', clan)} 
              userPlayerTag={playerTag}
            />
          </TabsContent>

          <TabsContent value="builder" className="mt-6">
            {player?.cards && user && (
              <DeckBuilder 
                availableCards={player.cards} 
                userId={user.id}
              />
            )}
          </TabsContent>

          <TabsContent value="coach" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Coach Chat</CardTitle>
                <CardDescription>Ask your AI coach anything</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Chat interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;