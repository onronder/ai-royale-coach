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
import { CoachChat } from "@/components/coach/CoachChat";
import { statTooltips } from "@/components/ui/tooltip-helpers";
import { PageTransition, StatCardSkeleton, MatchCardSkeleton } from "@/components/ui/loading-states";
import { CardCollectionTracker } from "@/components/cards/CardCollectionTracker";
import { TournamentList } from "@/components/tournaments/TournamentList";
import { ClanSearch } from "@/components/clans/ClanSearch";
import { DeckBuilder } from "@/components/deck/DeckBuilder";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { DeckStatsDashboard } from "@/components/analytics/DeckStatsDashboard";
import { CardMasteryTracker } from "@/components/mastery/CardMasteryTracker";
import { FloatingCoachButton } from "@/components/coach/FloatingCoachButton";
import { AchievementDashboard } from "@/components/achievements/AchievementDashboard";
import { AchievementBadgeWidget } from "@/components/achievements/AchievementBadgeWidget";
import { AchievementNotification } from "@/components/achievements/AchievementNotification";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";

const Dashboard = () => {
  const { playerTag } = useParams<{ playerTag: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedBattle, setSelectedBattle] = useState<ClashRoyaleBattle | null>(null);
  const [matchDetailOpen, setMatchDetailOpen] = useState(false);
  const { newAchievement, dismissNotification } = useAchievementNotifications(playerTag || '');
  
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
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Crown className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold font-rajdhani text-foreground">AI ROYAL</h1>
              <p className="text-xs text-muted-foreground">#{playerTag}</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          {player && (
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-rajdhani font-semibold">{player.trophies.toLocaleString()}</span>
              </div>
              {battles && (
                <div className="flex items-center gap-2">
                  <Swords className="h-4 w-4 text-success" />
                  <span className="font-rajdhani font-semibold">
                    {((battles.filter(b => {
                      const playerTeam = b.team.find(p => p.tag === playerTag);
                      return playerTeam && playerTeam.crowns > (b.opponent[0]?.crowns || 0);
                    }).length / battles.length) * 100).toFixed(0)}% WR
                  </span>
                </div>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          {/* Enhanced Tab Navigation */}
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 gap-2 h-auto p-2 bg-card/50 border border-border rounded-xl">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
            >
              <Trophy className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="matches"
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
            >
              <Swords className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Matches</span>
            </TabsTrigger>
            <TabsTrigger 
              value="deck"
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
            >
              <Target className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Deck</span>
            </TabsTrigger>
            <TabsTrigger 
              value="builder"
              className="data-[state=active]:bg-gradient-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-accent-glow font-rajdhani font-semibold"
            >
              <Wrench className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Builder</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground font-rajdhani font-semibold"
            >
              <TrendingUp className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collection"
              className="data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground font-rajdhani font-semibold"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="leaderboard"
              className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground font-rajdhani font-semibold"
            >
              <TrendingUp className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Ranks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tournaments"
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
            >
              <Award className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Tourneys</span>
            </TabsTrigger>
            <TabsTrigger 
              value="clans"
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow font-rajdhani font-semibold"
            >
              <UserPlus className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Clans</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <PageTransition>
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-4">
                  {playerLoading ? (
                    <>
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                      <StatCardSkeleton />
                    </>
                  ) : player ? (
                    <>
                      <StatCard
                        title="Current Trophies"
                        value={player.trophies.toLocaleString()}
                        icon={Trophy}
                        description={`Best: ${player.bestTrophies.toLocaleString()}`}
                        trend="neutral"
                        tooltip={statTooltips.trophies}
                      />
                      <StatCard
                        title="Arena"
                        value={player.arena?.name.split(' ')[0] || 'Unknown'}
                        icon={Crown}
                        description={player.arena?.name || ''}
                        tooltip={statTooltips.arena}
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
                        tooltip={statTooltips.winRate}
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

                {/* Achievement Badge Widget */}
                <AchievementBadgeWidget playerTag={playerTag!} />
              </div>
            </PageTransition>
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <PageTransition delay={100}>
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
                          <MatchCardSkeleton key={i} />
                        ))}
                      </div>
                    ) : battlesError ? (
                      <p className="text-muted-foreground">Failed to load battles</p>
                    ) : battles && battles.length > 0 ? (
                      <div className="space-y-3">
                        {battles.slice(0, 15).map((battle, idx) => (
                          <div
                            key={idx}
                            className="animate-slide-up"
                            style={{ animationDelay: `${idx * 30}ms` }}
                          >
                            <MatchCard
                              battle={battle}
                              playerTag={playerTag!}
                              onClick={() => handleMatchClick(battle)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No battles found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </PageTransition>

            <MatchDetailView
              battle={selectedBattle}
              playerTag={playerTag!}
              open={matchDetailOpen}
              onOpenChange={setMatchDetailOpen}
            />
          </TabsContent>

          <TabsContent value="deck" className="mt-6">
            <PageTransition delay={100}>
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
            </PageTransition>
          </TabsContent>

          <TabsContent value="collection" className="mt-6">
            <PageTransition delay={100}>
              {user && playerTag && (
                <CardCollectionTracker 
                  playerTag={playerTag} 
                  userId={user.id}
                />
              )}
            </PageTransition>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <PageTransition delay={100}>
              <LeaderboardView userClanTag={player?.clan?.tag} />
            </PageTransition>
          </TabsContent>

          <TabsContent value="tournaments" className="mt-6">
            <PageTransition delay={100}>
              <TournamentList onSelectTournament={(id) => console.log('Tournament:', id)} />
            </PageTransition>
          </TabsContent>

          <TabsContent value="clans" className="mt-6">
            <PageTransition delay={100}>
              <ClanSearch 
                onSelectClan={(clan) => console.log('Clan:', clan)} 
                userPlayerTag={playerTag}
              />
            </PageTransition>
          </TabsContent>

          <TabsContent value="builder" className="mt-6">
            <PageTransition delay={100}>
              {player?.cards && user && (
                <DeckBuilder 
                  availableCards={player.cards} 
                  userId={user.id}
                />
              )}
            </PageTransition>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PageTransition delay={100}>
              <Tabs defaultValue="deckstats" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="deckstats">Deck Stats</TabsTrigger>
                  <TabsTrigger value="mastery">Card Mastery</TabsTrigger>
                  <TabsTrigger value="achievements">Achievements</TabsTrigger>
                </TabsList>
                
                <TabsContent value="deckstats" className="mt-6">
                  <DeckStatsDashboard playerTag={playerTag!} />
                </TabsContent>
                
                <TabsContent value="mastery" className="mt-6">
                  <CardMasteryTracker playerTag={playerTag!} />
                </TabsContent>

                <TabsContent value="achievements" className="mt-6">
                  <AchievementDashboard playerTag={playerTag!} />
                </TabsContent>
              </Tabs>
            </PageTransition>
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating AI Coach Widget */}
      {player && battles && (
        <FloatingCoachButton
          playerTag={playerTag!}
          playerStats={{
            trophies: player.trophies,
            bestTrophies: player.bestTrophies,
            arena: player.arena?.name || 'Unknown',
            winRate: parseFloat((
              (battles.filter(b => {
                const playerTeam = b.team.find(p => p.tag === playerTag);
                return playerTeam && playerTeam.crowns > (b.opponent[0]?.crowns || 0);
              }).length / battles.length) * 100
            ).toFixed(1))
          }}
          recentMatches={{
            wins: battles.filter(b => {
              const playerTeam = b.team.find(p => p.tag === playerTag);
              return playerTeam && playerTeam.crowns > (b.opponent[0]?.crowns || 0);
            }).length,
            losses: battles.filter(b => {
              const playerTeam = b.team.find(p => p.tag === playerTag);
              return playerTeam && playerTeam.crowns <= (b.opponent[0]?.crowns || 0);
            }).length,
            avgTrophyChange: (
              battles.reduce((sum, b) => {
                const playerTeam = b.team.find(p => p.tag === playerTag);
                return sum + (playerTeam?.trophyChange || 0);
              }, 0) / battles.length
            ).toFixed(1)
          }}
        />
      )}

      {/* Achievement Notification */}
      {newAchievement && (
        <AchievementNotification
          achievement={newAchievement}
          onDismiss={dismissNotification}
        />
      )}
    </div>
  );
};

export default Dashboard;