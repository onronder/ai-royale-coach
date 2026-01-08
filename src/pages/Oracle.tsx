import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, Lock } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OracleScanner } from '@/components/oracle/OracleScanner';
import { FeatureGate } from '@/components/common/FeatureGate';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardLoader } from "@/components/ui/page-loader";
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useClashRoyalePlayer } from '@/hooks/useClashRoyalePlayer';
import { useWinRate } from '@/hooks/useWinRate';
import { useClashRoyaleBattles } from '@/hooks/useClashRoyaleBattles';

export default function Oracle() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerTag = searchParams.get('player') || '';
  const targetTag = searchParams.get('target') || '';
  
  // Auth check - redirects to /auth if not logged in
  const { user, handleSignOut } = useDashboardData(playerTag);
  
  // Fetch user's player data
  const { data: userPlayer, refetch: refetchPlayer } = useClashRoyalePlayer(playerTag || null);
  const { data: battles } = useClashRoyaleBattles(playerTag || null);
  const { winRate } = useWinRate(battles || [], playerTag);

  // Show loader while checking auth
  if (!user || !playerTag) {
    return <DashboardLoader />;
  }

  const handleTabChange = (tab: string) => {
    navigate(`/player/${playerTag}`);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background arena-bg flex w-full">
        {/* Desktop Sidebar - same as Dashboard */}
        <AppSidebar 
          activeTab="oracle"
          activeSubTab=""
          onTabChange={handleTabChange}
          onSubTabChange={() => {}}
          playerTag={playerTag}
          playerName={userPlayer?.name}
          trophies={userPlayer?.trophies}
          onSignOut={handleSignOut}
        />
        
        {/* Main Content */}
        <SidebarInset className="flex-1 pb-20 md:pb-0">
          <DashboardHeader
            playerTag={playerTag}
            player={userPlayer || null}
            winRate={winRate}
            userId={user?.id || null}
            isRefreshing={false}
            onRefresh={() => refetchPlayer()}
            onSignOut={handleSignOut}
          />
          
          <main className="container mx-auto px-4 py-6">
            {/* Desktop sidebar toggle */}
            <div className="hidden md:flex items-center gap-4 mb-4">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>The Oracle</span>
              </div>
            </div>

            {/* Page Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-2">
                <Eye className="w-8 h-8 text-emerald-400" />
                <h1 className="text-3xl font-bold font-rajdhani uppercase tracking-wider">
                  The Oracle
                </h1>
              </div>
              <p className="text-muted-foreground">
                Predict your opponent's deck before the match begins
              </p>
            </div>

            {/* Feature-Gated Scanner */}
            <FeatureGate
              feature="oracle"
              playerTag={playerTag}
              fallback={
                <div className="relative max-w-md mx-auto">
                  {/* Blurred preview */}
                  <div className="blur-md pointer-events-none opacity-50">
                    <OracleScanner />
                  </div>
                  {/* Overlay with upgrade message */}
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
                    <div className="text-center p-6">
                      <Lock className="w-12 h-12 text-gold mx-auto mb-4" />
                      <h3 className="font-bold text-lg mb-2">PRO Feature</h3>
                      <p className="text-muted-foreground text-sm">
                        Upgrade to PRO to unlock Live Match Predictions.
                      </p>
                    </div>
                  </div>
                </div>
              }
            >
              <OracleScanner 
                initialOpponentTag={targetTag}
                userPlayerTag={playerTag}
                userCurrentDeck={userPlayer?.currentDeck}
              />
            </FeatureGate>
          </main>
        </SidebarInset>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab="oracle"
          onTabChange={handleTabChange}
        />
      </div>
    </SidebarProvider>
  );
}
