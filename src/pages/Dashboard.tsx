import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Trophy, Target, Swords, Crown, Users, TrendingUp, Sparkles, Award, UserPlus, Wrench, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClashRoyalePlayer } from "@/hooks/useClashRoyalePlayer";
import { useClashRoyaleBattles } from "@/hooks/useClashRoyaleBattles";
import { usePlayerAnalysis } from "@/hooks/usePlayerAnalysis";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { MatchCard } from "@/components/matches/MatchCard";
import { MatchDetailView } from "@/components/matches/MatchDetailView";
import { DeckAnalysisPanel } from "@/components/deck/DeckAnalysisPanel";
import { StatCard } from "@/components/stats/StatCard";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { statTooltips } from "@/components/ui/tooltip-helpers";
import { PageTransition, StatCardSkeleton, MatchCardSkeleton } from "@/components/ui/loading-states";
import { DashboardLoader } from "@/components/ui/page-loader";
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
import { usePlayerProfiles } from "@/hooks/usePlayerProfiles";
import { EmptyState } from "@/components/ui/empty-state";
import { CacheStatusIndicator } from "@/components/analytics/CacheStatusIndicator";
import { DataLoader } from "@/components/ui/data-loader";
import { QuickAccountSwitch } from "@/components/player/QuickAccountSwitch";
import { TrophyProgressChart } from "@/components/analytics/TrophyProgressChart";

const Dashboard = () => {
  const { playerTag } = useParams<{ playerTag: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedBattle, setSelectedBattle] = useState<ClashRoyaleBattle | null>(null);
  const [matchDetailOpen, setMatchDetailOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { newAchievement, dismissNotification } = useAchievementNotifications(playerTag || '');
  
  const { data: player, isLoading: playerLoading, error: playerError, forceRefresh: forceRefreshPlayer } = useClashRoyalePlayer(playerTag || null);
  const { data: battles, isLoading: battlesLoading, error: battlesError, forceRefresh: forceRefreshBattles } = useClashRoyaleBattles(playerTag || null);
  const { data: analysis, isLoading: analysisLoading, error: analysisError } = usePlayerAnalysis(player, battles);
  
  // Player profiles hook for saving/updating last seen
  const { updateLastSeen } = usePlayerProfiles(user?.id || null);

  // Fetch additional data for AI coach context
  const [savedDecks, setSavedDecks] = useState<any[]>([]);
  const [cardMastery, setCardMastery] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [cardCollection, setCardCollection] = useState<any[]>([]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    const loadingToast = toast.loading('Syncing with Clash Royale servers...', {
      description: 'Fetching your latest player data and battle history'
    });
    try {
      await Promise.all([forceRefreshPlayer(), forceRefreshBattles()]);
      toast.success('Data refreshed successfully!', {
        id: loadingToast,
        description: 'Your profile and battle history are now up to date'
      });
    } catch (error) {
      toast.error('Failed to refresh data', {
        id: loadingToast,
        description: 'Please try again in a few moments'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMatchClick = (battle: ClashRoyaleBattle) => {
    setSelectedBattle(battle);
    setMatchDetailOpen(true);
  };

  // Fetch player context data for AI coach
  useEffect(() => {
    const fetchPlayerContext = async () => {
      if (!user?.id || !playerTag) return;
      
      // Fetch saved decks
      const { data: decks } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('user_id', user.id);
      if (decks) setSavedDecks(decks);

      // Fetch card mastery
      const { data: mastery } = await supabase
        .from('card_mastery')
        .select('*')
        .eq('player_tag', playerTag);
      if (mastery) setCardMastery(mastery);

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('player_tag', playerTag);
      if (achievementsData) setAchievements(achievementsData);

      // Fetch card collection
      const { data: collection } = await supabase
        .from('card_collection')
        .select('*')
        .eq('player_tag', playerTag);
      if (collection) setCardCollection(collection);
    };

    fetchPlayerContext();
  }, [user, playerTag]);

  // Auto-sync card collection, card mastery, and deck stats on first visit
  useEffect(() => {
    if (!user?.id || !playerTag) return;

    const runBackgroundSync = async () => {
      // Check if card collection is empty
      const { count: collectionCount } = await supabase
        .from('card_collection')
        .select('*', { count: 'exact', head: true })
        .eq('player_tag', playerTag);

      if (collectionCount === 0) {
        console.log('Starting background card collection sync...');
        supabase.functions
          .invoke('sync-card-collection', { body: { playerTag } })
          .then(() => {
            toast.success('Card collection synced');
          })
          .catch((err) => {
            console.error('Background sync failed:', err);
          });
      }

      // Check if card mastery is empty
      const { count: masteryCount } = await supabase
        .from('card_mastery')
        .select('*', { count: 'exact', head: true })
        .eq('player_tag', playerTag);

      if (masteryCount === 0) {
        console.log('Starting background card mastery calculation...');
        supabase.functions
          .invoke('calculate-card-mastery', { body: { playerTag } })
          .then(() => {
            toast.success('Card mastery calculated');
          })
          .catch((err) => {
            console.error('Background card mastery failed:', err);
          });
      }

      // Check if deck stats are empty
      const { count: deckStatsCount } = await supabase
        .from('deck_usage_stats')
        .select('*', { count: 'exact', head: true })
        .eq('player_tag', playerTag);

      if (deckStatsCount === 0) {
        console.log('Starting background deck stats tracking...');
        supabase.functions
          .invoke('track-deck-stats', { body: { playerTag } })
          .then(() => {
            toast.success('Deck stats tracked');
          })
          .catch((err) => {
            console.error('Background deck stats failed:', err);
          });
      }
    };

    runBackgroundSync();
  }, [user?.id, playerTag]);

  // Save/update player tag in player_profiles when visiting
  useEffect(() => {
    if (user?.id && playerTag) {
      updateLastSeen(playerTag);
    }
  }, [user?.id, playerTag, updateLastSeen]);

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

  // Show loading state while checking authentication
  if (!user) {
    return <DashboardLoader />;
  }

  if (!playerTag) {
    return <DashboardLoader />;
  }

  return (
    <div key={playerTag} className="min-h-screen bg-background arena-bg animate-page-fade-in">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-gold/20 bg-card/90 backdrop-blur-md shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Crown className="h-7 w-7 text-gold" />
              <div className="absolute inset-0 bg-gold/20 blur-lg -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-rajdhani text-foreground">AI ROYAL</h1>
              <p className="text-xs text-muted-foreground font-mono">#{playerTag}</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          {player && (
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20">
                <Trophy className="h-4 w-4 text-gold trophy-shimmer" />
                <span className="font-rajdhani font-bold text-gold">{player.trophies.toLocaleString()}</span>
              </div>
              {battles && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                  <Swords className="h-4 w-4 text-success" />
                  <span className="font-rajdhani font-bold text-success">
                    {((battles.filter(b => {
                      const normalizedPlayerTag = playerTag?.startsWith('#') ? playerTag : `#${playerTag}`;
                      const playerTeam = b.team.find(p => p.tag === normalizedPlayerTag);
                      return playerTeam && playerTeam.crowns > (b.opponent[0]?.crowns || 0);
                    }).length / battles.length) * 100).toFixed(0)}% WR
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Switch & Sign Out */}
          <div className="flex items-center gap-2">
            <CacheStatusIndicator 
              playerTag={playerTag} 
              onRefresh={handleRefreshData} 
              isRefreshing={isRefreshing} 
            />
            <QuickAccountSwitch 
              currentPlayerTag={playerTag} 
              userId={user?.id || null} 
            />
            <Button variant="outline" size="sm" onClick={handleSignOut} className="border-border/50 hover:border-destructive/50 hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          {/* Enhanced Tab Navigation */}
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 gap-2 h-auto p-2 bg-card/80 border border-gold/20 rounded-xl backdrop-blur-sm">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
            >
              <Trophy className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="matches"
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
            >
              <Swords className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Matches</span>
            </TabsTrigger>
            <TabsTrigger 
              value="deck"
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
            >
              <Target className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Deck</span>
            </TabsTrigger>
            <TabsTrigger 
              value="builder"
              className="data-[state=active]:bg-gradient-accent data-[state=active]:text-accent-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
            >
              <Wrench className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Builder</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
            >
              <TrendingUp className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collection"
              className="data-[state=active]:bg-gradient-legendary data-[state=active]:text-primary-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="leaderboard"
              className="data-[state=active]:bg-gradient-gold data-[state=active]:text-gold-foreground data-[state=active]:tab-glow-active font-rajdhani font-semibold transition-all"
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
                          const normalizedPlayerTag = playerTag?.startsWith('#') ? playerTag : `#${playerTag}`;
                          const playerTeam = b.team.find(p => p.tag === normalizedPlayerTag);
                          return playerTeam && playerTeam.crowns > (b.opponent[0]?.crowns || 0);
                        }).length / battles.length) * 100).toFixed(1)}%` : 'N/A'}
                        icon={Swords}
                        description="Last 25 battles"
                        trend={battles && (battles.filter(b => {
                          const normalizedPlayerTag = playerTag?.startsWith('#') ? playerTag : `#${playerTag}`;
                          const playerTeam = b.team.find(p => p.tag === normalizedPlayerTag);
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

                {/* Trophy Progress Chart */}
                <TrophyProgressChart 
                  battles={battles}
                  playerTag={playerTag}
                  currentTrophies={player?.trophies}
                  bestTrophies={player?.bestTrophies}
                />

              {/* AI Analysis Card */}
              <Card className="bg-card border-2 border-royal/40 shadow-lg relative overflow-hidden">
                {/* Subtle corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-royal/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                <CardHeader className="relative">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-royal/20 border border-royal/30">
                      <Sparkles className="h-5 w-5 text-royal" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground">AI Coach Summary</CardTitle>
                      <CardDescription>
                        Your personalized performance analysis
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  {analysisLoading ? (
                    <div className="flex items-center gap-3 py-4">
                      <Sparkles className="h-5 w-5 animate-pulse text-royal" />
                      <span className="text-sm text-muted-foreground">AI generating your analysis...</span>
                    </div>
                  ) : analysisError ? (
                    <p className="text-sm text-muted-foreground">Unable to generate analysis. Please try again later.</p>
                  ) : analysis ? (
                    <div className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">{analysis.analysis}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                        <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                          <p className="text-2xl font-bold text-success">{analysis.stats.winRate}%</p>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <p className={cn(
                            "text-2xl font-bold",
                            parseFloat(analysis.stats.avgTrophyChange) >= 0 ? "text-gold" : "text-destructive"
                          )}>
                            {parseFloat(analysis.stats.avgTrophyChange) >= 0 ? '+' : ''}{analysis.stats.avgTrophyChange}
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Trophy Δ</p>
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
                      <DataLoader context="battles" variant="inline" />
                    ) : battlesError ? (
                      <EmptyState
                        icon={Swords}
                        title="Failed to Load Battles"
                        description="Unable to fetch your battle history. Please try again later."
                        variant="compact"
                      />
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
                      <EmptyState
                        icon={Swords}
                        title="No Battles Yet"
                        description="Play some matches in Clash Royale and come back to track your performance!"
                        variant="compact"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </PageTransition>
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
                    <DataLoader context="deck" variant="inline" />
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
              <LeaderboardView 
                userClanTag={player?.clan?.tag} 
                userId={user?.id}
                currentPlayerTag={playerTag}
              />
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

      {/* Match Detail Dialog - Outside tabs so it always renders */}
      <MatchDetailView
        battle={selectedBattle}
        playerTag={playerTag!}
        open={matchDetailOpen}
        onOpenChange={setMatchDetailOpen}
        onOpenCoach={() => setCoachOpen(true)}
      />

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
          savedDecks={savedDecks}
          cardMastery={cardMastery}
          achievements={achievements}
          cardCollection={cardCollection}
          forceOpen={coachOpen}
          onOpenChange={setCoachOpen}
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