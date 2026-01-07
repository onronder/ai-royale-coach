import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useWinRate } from "@/hooks/useWinRate";
import { useClashRoyalePlayer } from "@/hooks/useClashRoyalePlayer";
import { useClashRoyaleBattles } from "@/hooks/useClashRoyaleBattles";
import { usePlayerAnalysis } from "@/hooks/usePlayerAnalysis";
import { usePlayerProfiles } from "@/hooks/usePlayerProfiles";
import { useAchievementNotifications } from "@/hooks/useAchievementNotifications";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import { useUnifiedRealtime } from "@/hooks/useUnifiedRealtime";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { DashboardLoader } from "@/components/ui/page-loader";
import { PageTransition } from "@/components/ui/loading-states";

// Dashboard sub-components
import { 
  DashboardHeader, 
  DashboardTabs,
  MobileBottomNav,
  OverviewTab, 
  MatchesTab, 
  DeckTab, 
  AnalyticsTab 
} from "@/components/dashboard";

// Layout components
import { AppSidebar } from "@/components/layout/AppSidebar";

// Feature components
import { MatchDetailView } from "@/components/matches/MatchDetailView";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { CardCollectionTracker } from "@/components/cards/CardCollectionTracker";
import { TournamentList } from "@/components/tournaments/TournamentList";
import { ClanSearch } from "@/components/clans/ClanSearch";
import { DeckBuilder } from "@/components/deck/DeckBuilder";
import { FloatingCoachButton } from "@/components/coach/FloatingCoachButton";
import { AchievementNotification } from "@/components/achievements/AchievementNotification";

const Dashboard = () => {
  const { t } = useTranslation();
  const { playerTag } = useParams<{ playerTag: string }>();
  
  // State for dialogs and interactions
  const [selectedBattle, setSelectedBattle] = useState<ClashRoyaleBattle | null>(null);
  const [matchDetailOpen, setMatchDetailOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("coach");
  
  // Custom hooks for data management
  const { user, playerContext, handleSignOut } = useDashboardData(playerTag);
  const { newAchievement, dismissNotification } = useAchievementNotifications(playerTag || '');
  const { updateLastSeen } = usePlayerProfiles(user?.id || null);
  
  // Data fetching hooks
  const { data: player, isLoading: playerLoading, error: playerError, forceRefresh: forceRefreshPlayer } = useClashRoyalePlayer(playerTag || null);
  const { data: battles, isLoading: battlesLoading, error: battlesError, forceRefresh: forceRefreshBattles } = useClashRoyaleBattles(playerTag || null);
  const { data: analysis, isLoading: analysisLoading, error: analysisError } = usePlayerAnalysis(player, battles);
  
  // Background sync for first-time visitors
  useBackgroundSync(user?.id || null, playerTag);
  
  // Unified realtime subscriptions (consolidated from 6 to 2 channels)
  useUnifiedRealtime(user?.id || null, playerTag);
  
  // Memoized win rate calculation
  const { winRate, formattedWinRate, wins, losses } = useWinRate(battles, playerTag);
  
  // Memoized average trophy change calculation
  const avgTrophyChange = useMemo(() => {
    if (!battles || battles.length === 0) return '0';
    const normalizedTag = playerTag?.startsWith('#') ? playerTag : `#${playerTag}`;
    const totalChange = battles.reduce((sum, b) => {
      const playerTeam = b.team.find(p => p.tag === normalizedTag);
      return sum + (playerTeam?.trophyChange || 0);
    }, 0);
    return (totalChange / battles.length).toFixed(1);
  }, [battles, playerTag]);

  // Save/update player tag in player_profiles when visiting
  useEffect(() => {
    if (user?.id && playerTag) {
      updateLastSeen(playerTag);
    }
  }, [user?.id, playerTag, updateLastSeen]);

  // Event handlers
  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    const loadingToast = toast.loading(t('dashboard.sync.syncing'), {
      description: t('dashboard.sync.fetchingData')
    });
    try {
      await Promise.all([forceRefreshPlayer(), forceRefreshBattles()]);
      toast.success(t('dashboard.sync.success'), {
        id: loadingToast,
        description: t('dashboard.sync.successDesc')
      });
    } catch (error) {
      toast.error(t('dashboard.sync.failed'), {
        id: loadingToast,
        description: t('dashboard.sync.failedDesc')
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [forceRefreshPlayer, forceRefreshBattles, t]);

  const handleMatchClick = useCallback((battle: ClashRoyaleBattle) => {
    setSelectedBattle(battle);
    setMatchDetailOpen(true);
  }, []);

  const handleSignOutWithToast = useCallback(async () => {
    await handleSignOut();
    toast.success(t('dashboard.signedOut'));
  }, [handleSignOut, t]);

  // Loading states
  if (!user || !playerTag) {
    return <DashboardLoader />;
  }

  return (
    <>
      <Helmet>
        <title>{player?.name || 'Dashboard'} - AI Royale</title>
        <meta name="description" content={`AI-powered analytics and coaching for ${player?.name || 'Clash Royale player'}. View stats, deck analysis, and personalized recommendations.`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <SidebarProvider defaultOpen={true}>
        <div key={playerTag} className="min-h-screen bg-background arena-bg animate-page-fade-in flex w-full">
          {/* Desktop Sidebar */}
          <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* Main Content Area */}
          <SidebarInset className="flex-1">
            <DashboardHeader
              playerTag={playerTag}
              player={player || null}
              winRate={winRate}
              userId={user?.id || null}
              isRefreshing={isRefreshing}
              onRefresh={handleRefreshData}
              onSignOut={handleSignOutWithToast}
            />

            <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
              {/* Sidebar Toggle for Desktop - positioned at top of content */}
              <div className="hidden md:flex items-center gap-2 mb-4">
                <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Hide horizontal tabs on desktop (sidebar is used instead), show on mobile */}
                <div className="md:hidden">
                  <DashboardTabs />
                </div>

                {/* COACH TAB */}
                <TabsContent value="coach" className="mt-6 md:mt-0">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full bg-muted/20 border-b border-white/5 rounded-none h-12">
                      <TabsTrigger value="overview" className="flex-1">{t("dashboard.subtabs.overview")}</TabsTrigger>
                      <TabsTrigger value="matches" className="flex-1">{t("dashboard.subtabs.matches")}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="mt-4">
                      <OverviewTab
                        playerTag={playerTag}
                        player={player || null}
                        battles={battles || null}
                        playerLoading={playerLoading}
                        formattedWinRate={formattedWinRate}
                        winRate={winRate}
                        analysis={analysis}
                        analysisLoading={analysisLoading}
                        analysisError={analysisError}
                      />
                    </TabsContent>
                    <TabsContent value="matches" className="mt-4">
                      <MatchesTab
                        playerTag={playerTag}
                        battles={battles || null}
                        battlesLoading={battlesLoading}
                        battlesError={battlesError}
                        onMatchClick={handleMatchClick}
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* DECK TAB */}
                <TabsContent value="deck" className="mt-6 md:mt-0">
                  <Tabs defaultValue="current" className="w-full">
                    <TabsList className="w-full bg-muted/20 border-b border-white/5 rounded-none h-12">
                      <TabsTrigger value="current" className="flex-1">{t("dashboard.subtabs.current")}</TabsTrigger>
                      <TabsTrigger value="builder" className="flex-1">{t("dashboard.subtabs.builder")}</TabsTrigger>
                      <TabsTrigger value="collection" className="flex-1">{t("dashboard.subtabs.collection")}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="current" className="mt-4">
                      <DeckTab
                        player={player || null}
                        battles={battles || null}
                        playerLoading={playerLoading}
                        playerError={playerError}
                        playerTag={playerTag || ''}
                      />
                    </TabsContent>
                    <TabsContent value="builder" className="mt-4">
                      <PageTransition delay={100}>
                        {player?.cards && user && (
                          <DeckBuilder 
                            availableCards={player.cards} 
                            userId={user.id}
                            savedDecks={playerContext.savedDecks?.map(d => ({
                              id: d.id,
                              name: d.name,
                              cards: d.cards as any,
                              avg_elixir: d.avg_elixir || undefined,
                              archetype: d.archetype || undefined
                            })) || []}
                            currentDeck={player.currentDeck || null}
                            userCollection={playerContext.cardCollection?.map(c => c.card_name) || []}
                            playerTrophies={player.trophies || 0}
                          />
                        )}
                      </PageTransition>
                    </TabsContent>
                    <TabsContent value="collection" className="mt-4">
                      <PageTransition delay={100}>
                        <CardCollectionTracker 
                          playerTag={playerTag} 
                          userId={user.id}
                        />
                      </PageTransition>
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* STATS TAB */}
                <TabsContent value="stats" className="mt-6 md:mt-0">
                  <Tabs defaultValue="analytics" className="w-full">
                    <TabsList className="w-full bg-muted/20 border-b border-white/5 rounded-none h-12">
                      <TabsTrigger value="analytics" className="flex-1">{t("dashboard.subtabs.analytics")}</TabsTrigger>
                      <TabsTrigger value="leaderboard" className="flex-1">{t("dashboard.subtabs.leaderboard")}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="analytics" className="mt-4">
                      <AnalyticsTab playerTag={playerTag} />
                    </TabsContent>
                    <TabsContent value="leaderboard" className="mt-4">
                      <PageTransition delay={100}>
                        <LeaderboardView 
                          userClanTag={player?.clan?.tag} 
                          userId={user?.id}
                          currentPlayerTag={playerTag}
                        />
                      </PageTransition>
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* SOCIAL TAB */}
                <TabsContent value="social" className="mt-6 md:mt-0">
                  <Tabs defaultValue="clans" className="w-full">
                    <TabsList className="w-full bg-muted/20 border-b border-white/5 rounded-none h-12">
                      <TabsTrigger value="clans" className="flex-1">{t("dashboard.subtabs.clans")}</TabsTrigger>
                      <TabsTrigger value="tournaments" className="flex-1">{t("dashboard.subtabs.tournaments")}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="clans" className="mt-4">
                      <PageTransition delay={100}>
                        <ClanSearch 
                          onSelectClan={() => {}} 
                          userPlayerTag={playerTag}
                        />
                      </PageTransition>
                    </TabsContent>
                    <TabsContent value="tournaments" className="mt-4">
                      <PageTransition delay={100}>
                        <TournamentList onSelectTournament={() => {}} />
                      </PageTransition>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </main>

            {/* Match Detail Dialog */}
            <MatchDetailView
              battle={selectedBattle}
              playerTag={playerTag}
              open={matchDetailOpen}
              onOpenChange={setMatchDetailOpen}
              onOpenCoach={() => setCoachOpen(true)}
            />

            {/* Floating AI Coach Widget */}
            {player && battles && (
              <FloatingCoachButton
                playerTag={playerTag?.startsWith('#') ? playerTag : `#${playerTag}`}
                playerStats={{
                  trophies: player.trophies,
                  bestTrophies: player.bestTrophies,
                  arena: player.arena?.name || 'Unknown',
                  winRate: winRate
                }}
                recentMatches={{
                  wins,
                  losses,
                  avgTrophyChange
                }}
                savedDecks={playerContext.savedDecks}
                cardMastery={playerContext.cardMastery}
                achievements={playerContext.achievements}
                cardCollection={playerContext.cardCollection}
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
          </SidebarInset>
          
          {/* Mobile Bottom Navigation */}
          <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </SidebarProvider>
    </>
  );
};

export default Dashboard;
