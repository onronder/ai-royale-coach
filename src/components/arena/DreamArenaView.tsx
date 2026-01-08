import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, Swords, FastForward, Play, Pause, Zap, MessageCircle, X, Share2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ViralMatchResult } from './ViralMatchResult';
import { cn } from '@/lib/utils';

import { SimulationResult, SimulationFrame, formatMatchTime } from '@/utils/dreamArenaEngine';
import { ProPlayer } from '@/data/proPlayers';
import { ClashRoyaleCard } from '@/services/clashRoyaleApi';

interface DreamArenaViewProps {
  userProfile: {
    name: string;
    avatarUrl?: string;
    trophies: number;
    deck: ClashRoyaleCard[];
  };
  proPlayer: ProPlayer;
  simulationResult: SimulationResult;
  onClose?: () => void;
  onPlayAgain?: () => void;
}

const TOWER_HP = 3056;

export function DreamArenaView({
  userProfile,
  proPlayer,
  simulationResult,
  onClose,
  onPlayAgain,
}: DreamArenaViewProps) {
  const { t } = useTranslation();
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [showResult, setShowResult] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [showViralCard, setShowViralCard] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredConfetti = useRef(false);

  // Get current frame data
  const currentFrame = simulationResult.timeline[currentTick] ?? simulationResult.timeline[simulationResult.timeline.length - 1];
  const { userHp, proHp, events, criticalAction } = currentFrame;

  // Playback loop
  useEffect(() => {
    if (!isPlaying || currentTick >= 180) return;

    const intervalMs = 1000 / playbackSpeed;

    const interval = setInterval(() => {
      setCurrentTick((prev) => {
        if (prev >= 180) {
          setIsPlaying(false);
          setShowResult(true);
          return 180;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, currentTick]);

  // Screen shake on critical hits
  useEffect(() => {
    if (criticalAction === 'rocket_hit' || criticalAction === 'tower_down') {
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 300);
    }
  }, [currentTick, criticalAction]);

  // Auto-scroll battle log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTick]);

  // Trigger confetti on victory
  useEffect(() => {
    if (showResult && simulationResult.winner === 'user' && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#22c55e', '#fbbf24', '#f59e0b'],
      });
    }
  }, [showResult, simulationResult.winner]);

  // Collect all events up to current tick
  const allEvents = simulationResult.timeline
    .slice(0, currentTick + 1)
    .flatMap((frame, idx) => frame.events.map(e => ({ event: e, tick: idx, criticalAction: frame.criticalAction })))
    .filter(e => e.event.length > 0);

  const handleSkipToResult = () => {
    setCurrentTick(180);
    setIsPlaying(false);
    setShowResult(true);
  };

  const getHpColor = (hp: number) => {
    const percentage = (hp / TOWER_HP) * 100;
    if (percentage > 70) return 'from-emerald to-emerald/80';
    if (percentage > 30) return 'from-gold to-warning';
    return 'from-destructive to-crimson';
  };

  const getHpBorderGlow = (hp: number, side: 'user' | 'pro') => {
    const percentage = (hp / TOWER_HP) * 100;
    const baseColor = side === 'user' ? 'emerald' : 'crimson';
    if (percentage > 70) return side === 'user' ? 'shadow-[0_0_20px_hsl(var(--emerald)/0.4)]' : 'shadow-[0_0_20px_hsl(var(--crimson)/0.4)]';
    if (percentage > 30) return 'shadow-[0_0_20px_hsl(var(--gold)/0.4)]';
    return 'shadow-[0_0_20px_hsl(var(--destructive)/0.5)]';
  };

  const getEventIcon = (action?: SimulationFrame['criticalAction']) => {
    switch (action) {
      case 'rocket_hit': return <Zap className="w-3 h-3 text-destructive" />;
      case 'tower_down': return <Crown className="w-3 h-3 text-gold" />;
      case 'defense_success': return <Shield className="w-3 h-3 text-emerald" />;
      case 'emote': return <MessageCircle className="w-3 h-3 text-royal" />;
      default: return null;
    }
  };

  const getEventClass = (action?: SimulationFrame['criticalAction']) => {
    switch (action) {
      case 'rocket_hit': return 'text-destructive';
      case 'tower_down': return 'text-gold font-semibold';
      case 'defense_success': return 'text-emerald';
      case 'emote': return 'text-royal italic';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4",
        shakeScreen && "animate-[shake_0.3s_ease-in-out]"
      )}
      style={{
        ['--shake-x' as string]: '4px',
      }}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      <div className="w-full max-w-2xl space-y-6">
        {/* Header - Face-off */}
        <div className="flex items-center justify-between gap-4">
          {/* User */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-emerald shadow-[0_0_15px_hsl(var(--emerald)/0.4)]">
                <AvatarImage src={userProfile.avatarUrl} />
                <AvatarFallback className="bg-emerald/20 text-emerald text-xl font-bold">
                  {userProfile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground truncate max-w-[100px]">{userProfile.name}</p>
              <div className="flex items-center gap-1 text-gold text-sm">
                <Crown className="w-3 h-3" />
                <span>{userProfile.trophies.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* VS Badge / Timer */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="flex flex-col items-center"
          >
            <Badge variant="outline" className="animate-pulse-glow border-primary/50 text-primary px-4 py-1">
              <Swords className="w-4 h-4 mr-1" />
              VS
            </Badge>
            <span className="font-mono text-2xl text-foreground mt-2 tabular-nums">
              {formatMatchTime(180 - currentTick)}
            </span>
          </motion.div>

          {/* Pro Player */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="text-right">
              <p className="font-bold text-foreground truncate max-w-[100px]">{proPlayer.name}</p>
              <div className="flex items-center justify-end gap-1 text-gold text-sm">
                <Crown className="w-3 h-3" />
                <span>{proPlayer.trophies.toLocaleString()}</span>
              </div>
              <Badge variant="secondary" className="text-xs mt-1">{proPlayer.specialty}</Badge>
            </div>
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-crimson shadow-[0_0_15px_hsl(var(--crimson)/0.4)]">
                <AvatarImage src={proPlayer.avatarUrl} />
                <AvatarFallback className="bg-crimson/20 text-crimson text-xl font-bold">
                  {proPlayer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </motion.div>
        </div>

        {/* Health Bars */}
        <div className="space-y-3">
          {/* User HP */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-emerald font-medium">{t('dreamArena.you', 'You')}</span>
              <span className="text-muted-foreground font-mono">{userHp} / {TOWER_HP}</span>
            </div>
            <div className={cn(
              "h-8 rounded-full bg-black/60 border border-emerald/30 overflow-hidden relative",
              getHpBorderGlow(userHp, 'user')
            )}>
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-300", getHpColor(userHp))}
                style={{ width: `${(userHp / TOWER_HP) * 100}%` }}
                layout
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                {Math.round((userHp / TOWER_HP) * 100)}%
              </span>
            </div>
          </div>

          {/* Pro HP */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-crimson font-medium">{proPlayer.name}</span>
              <span className="text-muted-foreground font-mono">{proHp} / {TOWER_HP}</span>
            </div>
            <div className={cn(
              "h-8 rounded-full bg-black/60 border border-crimson/30 overflow-hidden relative",
              getHpBorderGlow(proHp, 'pro')
            )}>
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-300", getHpColor(proHp))}
                style={{ width: `${(proHp / TOWER_HP) * 100}%` }}
                layout
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                {Math.round((proHp / TOWER_HP) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Battle Log */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t('dreamArena.battleLog', 'Battle Log')}</h3>
          <ScrollArea className="h-48 rounded-lg bg-black/80 backdrop-blur-sm border border-emerald/20 p-3">
            <div className="space-y-1 font-mono text-sm">
              <AnimatePresence mode="popLayout">
                {allEvents.map((item, idx) => (
                  <motion.div
                    key={`${item.tick}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn("flex items-start gap-2", getEventClass(item.criticalAction))}
                  >
                    <span className="text-muted-foreground/60 text-xs w-10 shrink-0">
                      [{formatMatchTime(180 - item.tick)}]
                    </span>
                    {getEventIcon(item.criticalAction)}
                    <span className="flex-1">{item.event}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={currentTick >= 180}
          >
            {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isPlaying ? t('dreamArena.pause', 'Pause') : t('dreamArena.play', 'Play')}
          </Button>

          <div className="flex gap-1">
            <Button
              variant={playbackSpeed === 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlaybackSpeed(1)}
            >
              1x
            </Button>
            <Button
              variant={playbackSpeed === 2 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlaybackSpeed(2)}
            >
              2x
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSkipToResult}
            disabled={currentTick >= 180}
          >
            <FastForward className="w-4 h-4 mr-1" />
            {t('dreamArena.skip', 'Skip')}
          </Button>
        </div>
      </div>

      {/* Viral Match Result Dialog */}
      <ViralMatchResult
        isOpen={showViralCard}
        onClose={() => setShowViralCard(false)}
        simulationResult={simulationResult}
        userProfile={userProfile}
        proPlayer={proPlayer}
      />

      {/* Result Overlay */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="text-center space-y-6 p-8"
            >
              <motion.div
                animate={simulationResult.winner === 'user' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <h2 className={cn(
                  "text-5xl font-bold",
                  simulationResult.winner === 'user' 
                    ? "text-emerald drop-shadow-[0_0_30px_hsl(var(--emerald)/0.5)]"
                    : "text-destructive drop-shadow-[0_0_30px_hsl(var(--destructive)/0.5)]"
                )}>
                  {simulationResult.winner === 'user' 
                    ? t('dreamArena.victory', 'Victory!')
                    : t('dreamArena.defeat', 'Defeat')}
                </h2>
              </motion.div>

              <p className="text-xl text-muted-foreground">
                {simulationResult.winner === 'user'
                  ? t('dreamArena.youWon', { proName: proPlayer.name, defaultValue: `You defeated ${proPlayer.name}!` })
                  : t('dreamArena.youLost', { proName: proPlayer.name, defaultValue: `${proPlayer.name} wins!` })}
              </p>

              <div className="flex items-center justify-center gap-8 text-lg">
                <div>
                  <p className="text-muted-foreground text-sm">{t('dreamArena.finalScore', 'Final Score')}</p>
                  <p className="text-3xl font-bold text-foreground">{simulationResult.finalScore}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t('dreamArena.winProbability', 'Win Probability')}</p>
                  <p className="text-3xl font-bold text-primary">{Math.round(simulationResult.winProbability * 100)}%</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                {onPlayAgain && (
                  <Button onClick={onPlayAgain} variant="default" size="lg">
                    {t('dreamArena.playAgain', 'Play Again')}
                  </Button>
                )}
                <Button
                  onClick={() => setShowViralCard(true)}
                  className="bg-gradient-to-r from-gold to-amber-500 text-black hover:from-gold/90 hover:to-amber-500/90"
                  size="lg"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('dreamArena.shareResult', 'Share Result')}
                </Button>
                <Button onClick={onClose} variant="outline" size="lg">
                  {t('dreamArena.close', 'Close')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
