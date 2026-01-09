import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Swords, Crown, ArrowLeft, Trophy, Sparkles, Lock, HelpCircle, ChevronDown, Wifi, Search, CheckCircle2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DreamArenaView } from '@/components/arena/DreamArenaView';
import { supabase } from '@/integrations/supabase/client';
import { useClashRoyalePlayer } from '@/hooks/useClashRoyalePlayer';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useProPlayerDeck } from '@/hooks/useProPlayerDeck';
import { PRO_PLAYER_PROFILES, ProPlayerProfile } from '@/data/proPlayers';
import { simulateDreamMatch, SimulationResult } from '@/utils/dreamArenaEngine';
import { sampleDecks } from '@/data/sampleDecks';
import { ClashRoyaleCard } from '@/services/clashRoyaleApi';
import { cn } from '@/lib/utils';

type ArenaState = 'select' | 'loading' | 'battle' | 'result';
type ConnectionPhase = 'connecting' | 'scouting' | 'ready';

// Map pro archetypes to sampleDeck IDs for fallback
const ARCHETYPE_FALLBACK_MAP: Record<string, string> = {
  'Cycle': 'hog-cycle',
  'Control': 'log-bait',
  'Siege': 'xbow-siege',
  'Log Bait': 'log-bait',
  'Hog': 'hog-cycle',
  'Beatdown': 'golem-beatdown',
};

// Convert sampleDeck cards to ClashRoyaleCard format for fallback
const getFallbackDeck = (archetype: string): ClashRoyaleCard[] => {
  const deckId = ARCHETYPE_FALLBACK_MAP[archetype] || 'hog-cycle';
  const sampleDeck = sampleDecks.find(d => d.id === deckId);
  
  if (!sampleDeck) return [];
  
  return sampleDeck.cards.map((card, index) => ({
    id: index + 1000,
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

export default function DreamArena() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerTag = searchParams.get('player') || '';

  const [arenaState, setArenaState] = useState<ArenaState>('select');
  const [selectedPro, setSelectedPro] = useState<ProPlayerProfile | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLiveDeck, setIsLiveDeck] = useState<boolean>(true);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>('connecting');

  // Get player data
  const { data: playerData, isLoading: isPlayerLoading } = useClashRoyalePlayer(playerTag);

  // Fetch selected pro player's deck via API
  const {
    deck: proDeck,
    trophies: proTrophies,
    isLoading: isProDeckLoading,
    isError: isProDeckError,
  } = useProPlayerDeck(selectedPro?.tag || '');

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
    if (arenaState === 'loading' && selectedPro) {
      setConnectionPhase('connecting');
      
      const timer1 = setTimeout(() => setConnectionPhase('scouting'), 1200);
      const timer2 = setTimeout(() => setConnectionPhase('ready'), 2400);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [arenaState, selectedPro]);

  // Start simulation when pro deck is loaded (success scenario)
  useEffect(() => {
    if (arenaState === 'loading' && selectedPro && proDeck.length >= 8 && !isProDeckLoading && !isProDeckError) {
      setIsLiveDeck(true);
      
      const userDeck = playerData?.currentDeck || [];
      const finalUserDeck = userDeck.length >= 8 ? userDeck : proDeck;

      const result = simulateDreamMatch({
        userDeck: finalUserDeck,
        proDeck,
        userTrophies: playerData?.trophies || 5000,
        proTrophies,
        userName: playerData?.name || 'Challenger',
        proName: selectedPro.name,
      });

      setSimulationResult(result);
      logUsage({ opponent: selectedPro.id });
      setArenaState('battle');
    }
  }, [arenaState, selectedPro, proDeck, isProDeckLoading, isProDeckError, playerData, proTrophies, logUsage]);

  // Handle API error with fallback
  useEffect(() => {
    if (arenaState === 'loading' && isProDeckError && selectedPro) {
      // API failed - use fallback deck
      const fallbackDeck = getFallbackDeck(selectedPro.archetype);
      
      toast.error(t('dreamArena.fallbackToast', 'Could not fetch live deck. Using simulation data.'));
      setIsLiveDeck(false);
      
      const userDeck = playerData?.currentDeck || [];
      const finalUserDeck = userDeck.length >= 8 ? userDeck : fallbackDeck;
      
      const result = simulateDreamMatch({
        userDeck: finalUserDeck,
        proDeck: fallbackDeck,
        userTrophies: playerData?.trophies || 5000,
        proTrophies: 9000, // Default high trophies for pro
        userName: playerData?.name || 'Challenger',
        proName: selectedPro.name,
      });
      
      setSimulationResult(result);
      logUsage({ opponent: selectedPro.id });
      setArenaState('battle');
    }
  }, [arenaState, isProDeckError, selectedPro, playerData, logUsage, t]);

  const handleSelectOpponent = async (pro: ProPlayerProfile) => {
    // Check access before starting
    const access = await checkAccess();
    if (!access.allowed) {
      return;
    }

    setSelectedPro(pro);
    setArenaState('loading');
  };

  const handleCloseBattle = () => {
    setArenaState('select');
    setSelectedPro(null);
    setSimulationResult(null);
    setIsLiveDeck(true);
  };

  const handlePlayAgain = () => {
    if (selectedPro) {
      setArenaState('loading');
    }
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
              {connectionPhase === 'scouting' && t('dreamArena.scouting', 'SCOUTING {{name}}...', { name: selectedPro?.name?.toUpperCase() })}
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

          {/* Pro Player Card Preview */}
          {selectedPro && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl bg-white/5 border border-crimson/30 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-crimson to-destructive flex items-center justify-center text-xl font-bold text-white">
                  {selectedPro.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground">{selectedPro.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPro.archetype} {t('dreamArena.specialist', 'Specialist')}</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Render battle view
  if (arenaState === 'battle' && selectedPro && simulationResult) {
    // Use the deck that was used for simulation (live or fallback)
    const battleDeck = isLiveDeck ? proDeck : getFallbackDeck(selectedPro.archetype);
    const battleTrophies = isLiveDeck ? proTrophies : 9000;
    
    return (
      <DreamArenaView
        userProfile={{
          name: playerData?.name || 'Challenger',
          avatarUrl: undefined,
          trophies: playerData?.trophies || 5000,
          deck: playerData?.currentDeck?.length >= 8 ? playerData.currentDeck : battleDeck,
        }}
        proPlayer={selectedPro}
        proDeck={battleDeck}
        proTrophies={battleTrophies}
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
        <meta name="description" content="Challenge legendary Clash Royale pros in AI-powered dream matches" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar user={user} />

        <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
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
                    {t('common.new', 'NEW')}
                  </Badge>
                </h1>
                <p className="text-muted-foreground">
                  {t('dreamArena.subtitle', 'Challenge legendary pros in AI-powered dream matches')}
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
                  <p className="text-sm text-muted-foreground">{t('dreamArena.step1')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-crimson/20 text-crimson flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <p className="text-sm text-muted-foreground">{t('dreamArena.step2')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-crimson/20 text-crimson flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <p className="text-sm text-muted-foreground">{t('dreamArena.step3')}</p>
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

          {/* Opponent Selection Grid */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" />
              {t('dreamArena.selectOpponent', 'Select Your Opponent')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRO_PLAYER_PROFILES.map((pro) => (
                <motion.div
                  key={pro.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      'cursor-pointer transition-all duration-200 border-2 hover:border-crimson/50 hover:shadow-lg hover:shadow-crimson/10',
                      selectedPro?.id === pro.id && 'border-crimson bg-crimson/5'
                    )}
                    onClick={() => !isLoading && canAccess && handleSelectOpponent(pro)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-crimson to-destructive flex items-center justify-center text-2xl font-bold text-white shadow-md">
                          {pro.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{pro.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-gold" />
                            <span className="text-gold font-medium">{pro.archetype}</span>
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {t(pro.specialty)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {t(pro.playstyle)}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {pro.archetype}
                        </Badge>

                        <Button
                          size="sm"
                          disabled={isLoading || !canAccess}
                          className="bg-gradient-to-r from-crimson to-destructive hover:from-crimson/90 hover:to-destructive/90"
                        >
                          {!canAccess ? (
                            <>
                              <Lock className="w-3 h-3 mr-1" />
                              {t('common.locked', 'Locked')}
                            </>
                          ) : (
                            <>
                              <Swords className="w-3 h-3 mr-1" />
                              {t('dreamArena.fight', 'Fight!')}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

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
