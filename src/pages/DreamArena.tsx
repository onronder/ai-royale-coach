import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Swords, Crown, ArrowLeft, Trophy, Sparkles, Lock, HelpCircle, ChevronDown, Wifi, Search, CheckCircle2, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { DreamArenaView } from '@/components/arena/DreamArenaView';
import { supabase } from '@/integrations/supabase/client';
import { useClashRoyalePlayer } from '@/hooks/useClashRoyalePlayer';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { clashRoyaleApi, LadderPlayer, ClashRoyaleCard } from '@/services/clashRoyaleApi';
import { simulateDreamMatch, SimulationResult } from '@/utils/dreamArenaEngine';
import { sampleDecks } from '@/data/sampleDecks';
import { cn } from '@/lib/utils';

type ArenaState = 'select' | 'loading' | 'battle';
type ConnectionPhase = 'connecting' | 'scouting' | 'ready';

// Fallback legends for when API is unavailable - All-Time Greats
const FALLBACK_LEGENDS: LadderPlayer[] = [
  {
    rank: 1,
    tag: '#Q982PQ',
    name: 'Mohamed Light',
    trophies: 9900,
    expLevel: 14,
    clan: { tag: '#ABC123', name: 'Tribe Gaming', badgeId: 0 },
  },
  {
    rank: 2,
    tag: '#R9J0',
    name: 'Morten',
    trophies: 9850,
    expLevel: 14,
    clan: { tag: '#DEF456', name: 'Team Liquid', badgeId: 0 },
  },
  {
    rank: 3,
    tag: '#90L0',
    name: 'Surgical Goblin',
    trophies: 9800,
    expLevel: 14,
    clan: { tag: '#GHI789', name: 'GamersOrigin', badgeId: 0 },
  },
  {
    rank: 4,
    tag: '#2Y2J09',
    name: 'Ryley',
    trophies: 9750,
    expLevel: 14,
    clan: { tag: '#JKL012', name: 'SK Gaming', badgeId: 0 },
  },
  {
    rank: 5,
    tag: '#2U00J8K',
    name: 'Ian77',
    trophies: 9700,
    expLevel: 14,
    clan: { tag: '#MNO345', name: 'Ian77 Army', badgeId: 0 },
  },
];

// Get a fallback sample deck as ClashRoyaleCard format
const getFallbackDeck = (): ClashRoyaleCard[] => {
  const hogCycleDeck = sampleDecks.find(d => d.id === 'hog-cycle');
  if (!hogCycleDeck) return [];
  
  return hogCycleDeck.cards.map((card, index) => ({
    id: 26000000 + index,
    name: card.name,
    level: 14,
    maxLevel: 14,
    elixirCost: card.elixir,
    rarity: card.rarity,
    iconUrls: {
      medium: `https://cdn.royaleapi.com/static/img/cards-150/${card.name.toLowerCase().replace(/\s+/g, '-')}.png`,
    },
  }));
};

// Selected opponent type (from leaderboard)
interface SelectedOpponent {
  tag: string;
  name: string;
  rank: number;
  trophies: number;
  clan?: { name: string; tag: string };
}

export default function DreamArena() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerTag = searchParams.get('player') || '';

  const [arenaState, setArenaState] = useState<ArenaState>('select');
  const [selectedOpponent, setSelectedOpponent] = useState<SelectedOpponent | null>(null);
  const [opponentDeck, setOpponentDeck] = useState<ClashRoyaleCard[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLiveDeck, setIsLiveDeck] = useState<boolean>(true);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>('connecting');
  const [isHallOfFame, setIsHallOfFame] = useState<boolean>(false);

  // Get player data
  const { data: playerData, isLoading: isPlayerLoading } = useClashRoyalePlayer(playerTag);

  // Fetch global top 10 leaderboard
  const {
    data: leaderboard,
    isLoading: isLeaderboardLoading,
    isError: isLeaderboardError,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ['globalLeaderboard'],
    queryFn: () => clashRoyaleApi.getGlobalTopLadder(10),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Feature access check
  const {
    canAccess,
    isLoading: isAccessLoading,
    remainingUses,
    checkAccess,
    logUsage,
    accessResult,
  } = useFeatureAccess('dream_arena', playerTag);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // If no player tag, redirect to select player
  useEffect(() => {
    if (!playerTag) {
      navigate('/select-player?returnTo=/arena');
    }
  }, [playerTag, navigate]);

  // Animate through connection phases
  useEffect(() => {
    if (arenaState === 'loading' && selectedOpponent) {
      setConnectionPhase('connecting');
      
      const timer1 = setTimeout(() => setConnectionPhase('scouting'), 1200);
      const timer2 = setTimeout(() => setConnectionPhase('ready'), 2400);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [arenaState, selectedOpponent]);

  // Fetch opponent deck when loading
  useEffect(() => {
    if (arenaState === 'loading' && selectedOpponent && connectionPhase === 'ready') {
      const fetchOpponentDeck = async () => {
        try {
          const opponentData = await clashRoyaleApi.getPlayer(selectedOpponent.tag);
          
          // Check for valid deck
          const deck = opponentData.currentDeck || [];
          if (deck.length < 8) {
            throw new Error('No valid deck found');
          }

          setOpponentDeck(deck);
          setIsLiveDeck(true);

          // Run simulation
          const userDeck = playerData?.currentDeck || [];
          const finalUserDeck = userDeck.length >= 8 ? userDeck : deck;

          const result = simulateDreamMatch({
            userDeck: finalUserDeck,
            proDeck: deck,
            userTrophies: playerData?.trophies || 5000,
            proTrophies: selectedOpponent.trophies,
            userName: playerData?.name || 'Challenger',
            proName: selectedOpponent.name,
          });

          setSimulationResult(result);
          logUsage({ opponent: selectedOpponent.tag, rank: selectedOpponent.rank });
          setArenaState('battle');

        } catch (error) {
          // Check if we're using Hall of Fame fallback - use sample deck for legends
          if (isHallOfFame) {
            const fallbackDeck = getFallbackDeck();
            if (fallbackDeck.length >= 8) {
              setOpponentDeck(fallbackDeck);
              setIsLiveDeck(false);
              
              toast.info(
                t('dreamArena.usingSimDeck', 'Using simulated deck for this legend.'),
                { duration: 3000 }
              );
              
              const userDeck = playerData?.currentDeck || [];
              const finalUserDeck = userDeck.length >= 8 ? userDeck : fallbackDeck;
              
              const result = simulateDreamMatch({
                userDeck: finalUserDeck,
                proDeck: fallbackDeck,
                userTrophies: playerData?.trophies || 5000,
                proTrophies: selectedOpponent.trophies,
                userName: playerData?.name || 'Challenger',
                proName: selectedOpponent.name,
              });
              
              setSimulationResult(result);
              logUsage({ opponent: selectedOpponent.tag, rank: selectedOpponent.rank });
              setArenaState('battle');
              return;
            }
          }
          
          // No fallback for live players - show authentic error
          toast.error(
            t('dreamArena.profileUnavailable', 'Player profile private or unavailable. Try another opponent.'),
            { duration: 4000 }
          );
          setArenaState('select');
          setSelectedOpponent(null);
        }
      };

      fetchOpponentDeck();
    }
  }, [arenaState, selectedOpponent, connectionPhase, playerData, logUsage, t, isHallOfFame]);

  const handleSelectOpponent = async (player: LadderPlayer) => {
    // Check access before starting
    const access = await checkAccess();
    if (!access.allowed) {
      return;
    }

    setSelectedOpponent({
      tag: player.tag,
      name: player.name,
      rank: player.rank,
      trophies: player.trophies,
      clan: player.clan,
    });
    setArenaState('loading');
  };

  const handleCloseBattle = () => {
    setArenaState('select');
    setSelectedOpponent(null);
    setSimulationResult(null);
    setOpponentDeck([]);
    setIsLiveDeck(true);
  };

  const handlePlayAgain = () => {
    if (selectedOpponent) {
      setArenaState('loading');
    }
  };

  // Get rank badge styles
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', text: 'text-yellow-900', glow: 'shadow-yellow-500/50' };
    if (rank === 2) return { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', text: 'text-gray-900', glow: 'shadow-gray-400/50' };
    if (rank === 3) return { bg: 'bg-gradient-to-br from-amber-600 to-amber-800', text: 'text-amber-100', glow: 'shadow-amber-600/50' };
    return { bg: 'bg-gradient-to-br from-slate-600 to-slate-800', text: 'text-slate-100', glow: '' };
  };

  const isLoading = isPlayerLoading || isAccessLoading;

  // Render cinematic loading overlay
  if (arenaState === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-b from-crimson/10 via-transparent to-crimson/10" />
          <motion.div
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,59,48,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,59,48,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Pulsing Radar Effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute w-32 h-32 rounded-full border-2 border-crimson/50"
          />
          <motion.div
            animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
            className="absolute w-32 h-32 rounded-full border-2 border-crimson/50"
          />
          <motion.div
            animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
            className="absolute w-32 h-32 rounded-full border-2 border-crimson/50"
          />
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center space-y-6"
        >
          {/* Animated Icon */}
          <motion.div
            animate={{ 
              rotate: connectionPhase === 'scouting' ? [0, 360] : 0,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1, repeat: Infinity }
            }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-crimson to-destructive flex items-center justify-center shadow-2xl shadow-crimson/50"
          >
            {connectionPhase === 'connecting' && <Wifi className="w-12 h-12 text-white" />}
            {connectionPhase === 'scouting' && <Search className="w-12 h-12 text-white" />}
            {connectionPhase === 'ready' && <CheckCircle2 className="w-12 h-12 text-white" />}
          </motion.div>

          {/* Status Text */}
          <div className="space-y-2">
            <motion.p
              key={connectionPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-mono font-bold text-crimson tracking-wider uppercase"
            >
              {connectionPhase === 'connecting' && t('dreamArena.connecting', 'CONNECTING TO SUPERCELL SERVERS...')}
              {connectionPhase === 'scouting' && t('dreamArena.scouting', 'SCOUTING {{name}}...', { name: selectedOpponent?.name?.toUpperCase() })}
              {connectionPhase === 'ready' && t('dreamArena.ready', 'DATA ACQUIRED')}
            </motion.p>
            
            {/* Progress Bar */}
            <div className="w-64 h-2 mx-auto bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ 
                  width: connectionPhase === 'connecting' ? '33%' 
                       : connectionPhase === 'scouting' ? '66%' 
                       : '100%' 
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-crimson to-primary rounded-full"
              />
            </div>
          </div>

          {/* Opponent Card Preview */}
          {selectedOpponent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl bg-white/5 border border-crimson/30 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold shadow-lg",
                  getRankBadge(selectedOpponent.rank).bg,
                  getRankBadge(selectedOpponent.rank).text,
                  getRankBadge(selectedOpponent.rank).glow
                )}>
                  #{selectedOpponent.rank}
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground">{selectedOpponent.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-gold" />
                    {selectedOpponent.trophies.toLocaleString()}
                    {selectedOpponent.clan && (
                      <>
                        <span className="mx-1">•</span>
                        {selectedOpponent.clan.name}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Render battle view
  if (arenaState === 'battle' && selectedOpponent && simulationResult) {
    // Create a compatible pro player object for DreamArenaView
    const proPlayerCompat = {
      id: selectedOpponent.tag,
      name: selectedOpponent.name,
      tag: selectedOpponent.tag,
      archetype: 'Top Ladder',
      playstyle: '',
      specialty: '',
    };
    
    return (
      <DreamArenaView
        userProfile={{
          name: playerData?.name || 'Challenger',
          avatarUrl: undefined,
          trophies: playerData?.trophies || 5000,
          deck: playerData?.currentDeck?.length >= 8 ? playerData.currentDeck : opponentDeck,
        }}
        proPlayer={proPlayerCompat}
        proDeck={opponentDeck}
        proTrophies={selectedOpponent.trophies}
        simulationResult={simulationResult}
        isLiveDeck={isLiveDeck}
        onClose={handleCloseBattle}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('dreamArena.title')} | AI Royale Coach</title>
        <meta name="description" content="Challenge the world's best Clash Royale players in AI-powered dream matches" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar user={user} />

        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(playerTag ? `/player/${playerTag}` : '/select-player')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-crimson to-destructive flex items-center justify-center shadow-lg">
                <Swords className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-rajdhani font-bold text-foreground flex items-center gap-2">
                  {t('dreamArena.title')}
                  <Badge className="bg-crimson/20 text-crimson border-crimson/30">
                    {t('dreamArena.live', 'LIVE')}
                  </Badge>
                </h1>
                <p className="text-muted-foreground">
                  {t('dreamArena.liveSubtitle', 'Challenge the Global Top 10 with real-time data')}
                </p>
              </div>
            </div>
          </div>

          {/* How it Works Collapsible */}
          <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen} className="mb-6">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  {t('dreamArena.howItWorks')}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isHelpOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-crimson/20 text-crimson flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <p className="text-sm text-muted-foreground">{t('dreamArena.liveStep1', 'Select a player from the live Global Top 10 leaderboard')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-crimson/20 text-crimson flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <p className="text-sm text-muted-foreground">{t('dreamArena.liveStep2', 'We fetch their current deck in real-time from Supercell servers')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-crimson/20 text-crimson flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <p className="text-sm text-muted-foreground">{t('dreamArena.liveStep3', 'Our AI simulates the match based on real playstyles and meta')}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Feature Usage Indicator */}
          {!canAccess && accessResult?.reason === 'quota_exceeded' && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
              <p className="text-destructive font-medium mb-2">
                {t('dreamArena.limitReached', 'Daily limit reached')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('dreamArena.upgradeForUnlimited', 'Upgrade to Pro for unlimited matches')}
              </p>
            </div>
          )}

          {/* Live Leaderboard / Hall of Fame */}
          {(() => {
            // Determine if we should use fallback
            const displayPlayers = (leaderboard && leaderboard.length > 0) 
              ? leaderboard 
              : FALLBACK_LEGENDS;
            const showingFallback = !leaderboard || leaderboard.length === 0;
            
            // Set Hall of Fame state for deck fallback logic
            if (showingFallback !== isHallOfFame) {
              setTimeout(() => setIsHallOfFame(showingFallback), 0);
            }

            return (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Crown className="w-5 h-5 text-gold" />
                    {showingFallback 
                      ? t('dreamArena.hallOfFame', 'Hall of Fame')
                      : t('dreamArena.globalTop10', 'Global Top 10')}
                    {!showingFallback && (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-1 ml-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-green-500 font-medium uppercase">{t('dreamArena.live', 'LIVE')}</span>
                      </motion.span>
                    )}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchLeaderboard()}
                    disabled={isLeaderboardLoading}
                  >
                    <RefreshCw className={cn("w-4 h-4", isLeaderboardLoading && "animate-spin")} />
                  </Button>
                </div>

                {/* Fallback Notice */}
                {showingFallback && !isLeaderboardLoading && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {t('dreamArena.fallbackNotice', 'Live rankings unavailable. Showing All-Time Legends.')}
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {isLeaderboardLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error State - only show if also no fallback */}
                {isLeaderboardError && !showingFallback && (
                  <div className="p-8 rounded-xl bg-destructive/5 border border-destructive/20 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                    <p className="text-destructive font-medium mb-2">
                      {t('dreamArena.leaderboardError', 'Failed to load leaderboard')}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => refetchLeaderboard()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('common.retry', 'Retry')}
                    </Button>
                  </div>
                )}

                {/* Leaderboard List - Always show something (live or fallback) */}
                {!isLeaderboardLoading && displayPlayers.length > 0 && (
                  <div className="space-y-2">
                    {displayPlayers.map((player, index) => {
                  const playerRank = player.rank ?? (index + 1);
                  const rankStyle = getRankBadge(playerRank);
                  const isTopThree = playerRank <= 3;
                  
                  return (
                    <motion.div
                      key={player.tag}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => !isLoading && canAccess && handleSelectOpponent(player)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200",
                        "bg-card border-2 border-border hover:border-crimson/50 hover:shadow-lg hover:shadow-crimson/5",
                        isTopThree && "bg-gradient-to-r from-card to-card/80",
                        !canAccess && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {/* Rank Badge */}
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg",
                        rankStyle.bg,
                        rankStyle.text,
                        rankStyle.glow && `shadow-lg ${rankStyle.glow}`
                      )}>
                        #{player.rank ?? (index + 1)}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate text-lg">
                          {player.name}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          {player.clan ? (
                            <>
                              <Users className="w-3 h-3" />
                              <span className="truncate">{player.clan.name}</span>
                            </>
                          ) : (
                            <span className="italic">{t('dreamArena.noClan', 'No Clan')}</span>
                          )}
                        </p>
                      </div>

                      {/* Trophies */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-gold flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            {(player.trophies ?? 0).toLocaleString()}
                          </p>
                        </div>
                        
                        {/* Fight Button */}
                        <Button
                          size="sm"
                          disabled={isLoading || !canAccess}
                          className="bg-gradient-to-r from-crimson to-destructive hover:from-crimson/90 hover:to-destructive/90 ml-2"
                        >
                          {!canAccess ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <>
                              <Swords className="w-4 h-4 mr-1" />
                              {t('dreamArena.fight', 'Fight!')}
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Usage Stats */}
          {canAccess && (
            <div className="text-center text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 inline-block mr-1" />
              {remainingUses === Infinity
                ? t('dreamArena.unlimitedMatches', 'Unlimited matches available')
                : t('dreamArena.matchesRemaining', '{{count}} matches remaining today', { count: remainingUses })}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
