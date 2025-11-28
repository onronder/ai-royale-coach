import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  OverviewTab, 
  MatchesTab, 
  DeckTab, 
  AnalyticsTab 
} from "@/components/dashboard";

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
    <div key={playerTag} className="min-h-screen bg-background arena-bg animate-page-fade-in">
      <DashboardHeader
        playerTag={playerTag}
        player={player || null}
        winRate={winRate}
        userId={user?.id || null}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshData}
        onSignOut={handleSignOutWithToast}
      />

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <DashboardTabs />

          <TabsContent value="overview" className="mt-6">
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

          <TabsContent value="matches" className="mt-6">
            <MatchesTab
              playerTag={playerTag}
              battles={battles || null}
              battlesLoading={battlesLoading}
              battlesError={battlesError}
              onMatchClick={handleMatchClick}
            />
          </TabsContent>

          <TabsContent value="deck" className="mt-6">
            <DeckTab
              player={player || null}
              battles={battles || null}
              playerLoading={playerLoading}
              playerError={playerError}
            />
          </TabsContent>

          <TabsContent value="collection" className="mt-6">
            <PageTransition delay={100}>
              <CardCollectionTracker 
                playerTag={playerTag} 
                userId={user.id}
              />
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
            <AnalyticsTab playerTag={playerTag} />
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
    </div>
  );
};

export default Dashboard;
