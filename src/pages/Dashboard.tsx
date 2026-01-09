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
import { useWhatsNew } from "@/hooks/useWhatsNew";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import { useUnifiedRealtime } from "@/hooks/useUnifiedRealtime";
import { usePlayerAchievements } from "@/hooks/usePlayerAchievements";
import { useFraudStatus } from "@/hooks/useFraudStatus";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { DashboardLoader } from "@/components/ui/page-loader";
import { PageTransition } from "@/components/ui/loading-states";
import { DataLoader } from "@/components/ui/data-loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Dashboard sub-components
import { 
  DashboardHeader, 
  DashboardTabs,
  DashboardBreadcrumb,
  MobileBottomNav,
  SwipeableTabsWrapper,
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
import { ProDNAView } from "@/components/social/ProDNAView";
import { WhatsNewModal } from "@/components/announcements/WhatsNewModal";
import { AchievementsTab } from "@/components/gamification/AchievementsTab";
import { SoftBlockWarning } from "@/components/fraud/SoftBlockWarning";
import { HelpDialog } from "@/components/help/HelpDialog";
const Dashboard = () => {
  const { t, ready: translationsReady } = useTranslation();
  const { playerTag } = useParams<{ playerTag: string }>();
  
  // State for dialogs and interactions
  const [selectedBattle, setSelectedBattle] = useState<ClashRoyaleBattle | null>(null);
  const [matchDetailOpen, setMatchDetailOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [dnaOpen, setDnaOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("coach");
  const [activeSubTab, setActiveSubTab] = useState("overview");
  
  // Custom hooks for data management
  const { user, playerContext, handleSignOut } = useDashboardData(playerTag);
  const { newAchievement, dismissNotification } = useAchievementNotifications(playerTag || '');
  const { updateLastSeen } = usePlayerProfiles(user?.id || null);
  const { showWhatsNew, dismissWhatsNew } = useWhatsNew();
  
  // Fraud status - triggers fingerprint logging and provides warning state
  const { fraudStatus, isSoftBlocked, isWarned } = useFraudStatus(user?.id || null);
  
  // Data fetching hooks
  const { data: player, isLoading: playerLoading, error: playerError, forceRefresh: forceRefreshPlayer } = useClashRoyalePlayer(playerTag || null);
  const { data: battles, isLoading: battlesLoading, error: battlesError, forceRefresh: forceRefreshBattles } = useClashRoyaleBattles(playerTag || null);
  const { data: analysis, isLoading: analysisLoading, error: analysisError } = usePlayerAnalysis(player, battles);
  const { achievements: battleAchievements } = usePlayerAchievements(battles || null);
  
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

  // Reset sub-tab to default when switching main tabs
  useEffect(() => {
    const defaultSubTabs: Record<string, string> = {
      coach: "overview",
      deck: "current",
      social: "clans",
    };
    setActiveSubTab(defaultSubTabs[activeTab] || "overview");
  }, [activeTab]);

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

  // Loading states - wait for user, player tag, and translations
  if (!user || !playerTag || !translationsReady) {
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
          <AppSidebar 
            activeTab={activeTab} 
            activeSubTab={activeSubTab} 
            onTabChange={setActiveTab}
            onSubTabChange={setActiveSubTab}
            playerTag={playerTag}
            playerName={player?.name}
            trophies={player?.trophies}
            userId={user?.id}
            onSignOut={handleSignOutWithToast}
            onOpenDNA={() => setDnaOpen(true)}
            onOpenAchievements={() => setAchievementsOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
          />
          
          {/* Main Content Area - Full width on mobile, flex on desktop */}
          <SidebarInset className="flex-1 w-full max-w-full overflow-x-hidden">
            <DashboardHeader
              playerTag={playerTag}
              player={player || null}
              winRate={winRate}
              userId={user?.id || null}
              isRefreshing={isRefreshing}
              onRefresh={handleRefreshData}
              onSignOut={handleSignOutWithToast}
              onOpenHelp={() => setHelpOpen(true)}
              onOpenSettings={() => window.location.href = '/settings'}
            />

            <main className="container mx-auto px-3 py-4 pb-24 md:px-6 md:py-6 md:pb-6 max-w-full">
              {/* Fraud Warning Banner */}
              {(isSoftBlocked || isWarned) && fraudStatus && (
                <SoftBlockWarning status={fraudStatus.status} className="mb-4" />
              )}
              
              {/* Desktop: Sidebar Toggle + Breadcrumb */}
              <div className="hidden md:flex items-center gap-4 mb-4">
                <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
                <DashboardBreadcrumb activeTab={activeTab} activeSubTab={activeSubTab} />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Hide horizontal tabs on desktop (sidebar is used instead), show on mobile */}
                <div className="md:hidden">
                  <DashboardTabs />
                </div>

                {/* Mobile Swipeable Wrapper */}
                <SwipeableTabsWrapper activeTab={activeTab}>

                <TabsContent value="coach" className="mt-6 md:mt-0">
                  <Tabs value={activeTab === "coach" ? activeSubTab : "overview"} onValueChange={setActiveSubTab} className="w-full">
                    <TabsList className="w-full bg-muted/20 border-b border-white/5 rounded-none h-12">
                      <TabsTrigger value="overview" className="flex-1">{t("dashboard.subtabs.overview")}</TabsTrigger>
                      <TabsTrigger value="matches" className="flex-1">{t("dashboard.subtabs.matches")}</TabsTrigger>
                      <TabsTrigger value="analytics" className="flex-1">{t("dashboard.subtabs.analytics")}</TabsTrigger>
                      <TabsTrigger value="leaderboard" className="flex-1">{t("dashboard.subtabs.leaderboard")}</TabsTrigger>
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

                {/* DECK TAB */}
                <TabsContent value="deck" className="mt-6 md:mt-0">
                  <Tabs value={activeTab === "deck" ? activeSubTab : "current"} onValueChange={setActiveSubTab} className="w-full">
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
                        {playerLoading ? (
                          <DataLoader context="deck" variant="inline" />
                        ) : player?.cards && user ? (
                          <DeckBuilder 
                            availableCards={player.cards} 
                            userId={user.id}
                            savedDecks={playerContext.savedDecks?.map(d => {
                              const cardNames = Array.isArray(d.cards) ? d.cards.filter((c): c is string => typeof c === 'string') : [];
                              return {
                                id: d.id,
                                name: d.name,
                                cards: cardNames.map(name => player.cards.find(c => c.name === name)).filter((c): c is NonNullable<typeof c> => c !== undefined),
                                avg_elixir: d.avg_elixir || undefined,
                                archetype: d.archetype || undefined
                              };
                            }) || []}
                            currentDeck={player.currentDeck || null}
                            userCollection={playerContext.cardCollection?.map(c => c.card_name) || []}
                            playerTrophies={player.trophies || 0}
                          />
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>{t('common.noData')}</p>
                          </div>
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

                {/* SOCIAL TAB */}
                <TabsContent value="social" className="mt-6 md:mt-0">
                  <Tabs value={activeTab === "social" ? activeSubTab : "clans"} onValueChange={setActiveSubTab} className="w-full">
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
                </SwipeableTabsWrapper>
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

            {/* Pro DNA Modal */}
            <ProDNAView
              open={dnaOpen}
              onOpenChange={setDnaOpen}
              playerTag={playerTag}
              playerName={player?.name || "Player"}
            />

            {/* Achievements Modal */}
            <Dialog open={achievementsOpen} onOpenChange={setAchievementsOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="sr-only">Achievements</DialogTitle>
                </DialogHeader>
                <AchievementsTab
                  playerTag={playerTag}
                  playerName={player?.name}
                  battles={battles || null}
                  unlockedAchievements={battleAchievements}
                />
              </DialogContent>
            </Dialog>

            {/* Achievement Notification */}
            {newAchievement && (
              <AchievementNotification
                achievement={newAchievement}
                onDismiss={dismissNotification}
              />
            )}

            {/* What's New Modal */}
            <WhatsNewModal
              open={showWhatsNew}
              onDismiss={dismissWhatsNew}
              playerTag={playerTag}
            />

            {/* Help Dialog */}
            <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
          </SidebarInset>
          
          {/* Mobile Bottom Navigation */}
          <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} onDnaClick={() => setDnaOpen(true)} />
        </div>
      </SidebarProvider>
    </>
  );
};

export default Dashboard;
