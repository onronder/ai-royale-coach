import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Swords, Crown, ArrowLeft, Trophy, Sparkles, Lock } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DreamArenaView } from '@/components/arena/DreamArenaView';
import { supabase } from '@/integrations/supabase/client';
import { useClashRoyalePlayer } from '@/hooks/useClashRoyalePlayer';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { PRO_PLAYERS, ProPlayer } from '@/data/proPlayers';
import { simulateDreamMatch, SimulationResult } from '@/utils/dreamArenaEngine';
import { cn } from '@/lib/utils';

type ArenaState = 'select' | 'battle' | 'result';

export default function DreamArena() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerTag = searchParams.get('player') || '';

  const [arenaState, setArenaState] = useState<ArenaState>('select');
  const [selectedPro, setSelectedPro] = useState<ProPlayer | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);

  // Get player data
  const { data: playerData, isLoading: isPlayerLoading } = useClashRoyalePlayer(playerTag);

  // Feature access check
  const {
    canAccess,
    isLoading: isAccessLoading,
    usageCount,
    effectiveLimit,
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

  const handleSelectOpponent = async (pro: ProPlayer) => {
    // Check access before starting
    const access = await checkAccess();
    if (!access.allowed) {
      return;
    }

    setSelectedPro(pro);

    // Get user's current deck from player data
    const userDeck = playerData?.currentDeck || [];

    if (userDeck.length < 8) {
      // Use a default deck if user doesn't have one
      const defaultDeck = PRO_PLAYERS[0].signatureDeck;
      const result = simulateDreamMatch({
        userDeck: defaultDeck,
        proDeck: pro.signatureDeck,
        userTrophies: playerData?.trophies || 5000,
        proTrophies: pro.trophies,
        userName: playerData?.name || 'Challenger',
        proName: pro.name,
      });
      setSimulationResult(result);
    } else {
      const result = simulateDreamMatch({
        userDeck,
        proDeck: pro.signatureDeck,
        userTrophies: playerData?.trophies || 5000,
        proTrophies: pro.trophies,
        userName: playerData?.name || 'Challenger',
        proName: pro.name,
      });
      setSimulationResult(result);
    }

    // Log usage
    await logUsage({ opponent: pro.id });

    setArenaState('battle');
  };

  const handleCloseBattle = () => {
    setArenaState('select');
    setSelectedPro(null);
    setSimulationResult(null);
  };

  const handlePlayAgain = () => {
    if (selectedPro) {
      handleSelectOpponent(selectedPro);
    }
  };

  const isLoading = isPlayerLoading || isAccessLoading;

  // Render battle view
  if (arenaState === 'battle' && selectedPro && simulationResult && playerData) {
    return (
      <DreamArenaView
        userProfile={{
          name: playerData.name || 'Challenger',
          avatarUrl: undefined,
          trophies: playerData.trophies || 5000,
          deck: playerData.currentDeck || PRO_PLAYERS[0].signatureDeck,
        }}
        proPlayer={selectedPro}
        simulationResult={simulationResult}
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
        <Navbar />

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
              {PRO_PLAYERS.map((pro) => (
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
                            <span className="text-gold font-medium">{pro.trophies.toLocaleString()}</span>
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {pro.specialty}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pro.playstyle}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {pro.signatureDeck.slice(0, 4).map((card, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-lg bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                              title={card.name}
                            >
                              {card.name.charAt(0)}
                            </div>
                          ))}
                          <div className="w-8 h-8 rounded-lg bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                            +4
                          </div>
                        </div>

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
