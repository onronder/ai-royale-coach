import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, Swords, FastForward, Play, Pause, Zap, MessageCircle, X, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ViralMatchResult } from './ViralMatchResult';
import { cn } from '@/lib/utils';
import { useArenaSound } from '@/hooks/useArenaSound';

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
  const { play: playSound } = useArenaSound({ enabled: false, volume: 0.5 });
  
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [showResult, setShowResult] = useState(false);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [showViralCard, setShowViralCard] = useState(false);
  const [activeCard, setActiveCard] = useState<ClashRoyaleCard | null>(null);
  
  // Ghost bar state for damage trailing effect
  const [prevUserHp, setPrevUserHp] = useState(TOWER_HP);
  const [prevProHp, setPrevProHp] = useState(TOWER_HP);
  const [ghostUserHp, setGhostUserHp] = useState(TOWER_HP);
  const [ghostProHp, setGhostProHp] = useState(TOWER_HP);
  
  // Bar shake state
  const [userBarShake, setUserBarShake] = useState(false);
  const [proBarShake, setProBarShake] = useState(false);
  
  // Critical hit FX state
  const [criticalFlash, setCriticalFlash] = useState(false);
  const [criticalText, setCriticalText] = useState<string | null>(null);
  
  // Elixir bar state
  const [userElixir, setUserElixir] = useState(5);
  const [proElixir, setProElixir] = useState(5);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredConfetti = useRef(false);
  const activeCardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current frame data
  const currentFrame = simulationResult.timeline[currentTick] ?? simulationResult.timeline[simulationResult.timeline.length - 1];
  const { userHp, proHp, events, criticalAction } = currentFrame;

  // Find card from event text by matching card names
  const findCardFromEvent = (eventText: string): ClashRoyaleCard | null => {
    const allCards = [...userProfile.deck, ...(proPlayer.signatureDeck || [])];
    
    for (const card of allCards) {
      if (eventText.toLowerCase().includes(card.name.toLowerCase())) {
        return card;
      }
    }
    return null;
  };

  // Playback loop with card spotlight detection
  useEffect(() => {
    if (!isPlaying || currentTick >= 180) return;

    const intervalMs = 1000 / playbackSpeed;

    const interval = setInterval(() => {
      setCurrentTick((prev) => {
        const nextTick = prev + 1;
        
        if (nextTick >= 180) {
          setIsPlaying(false);
          setShowResult(true);
          return 180;
        }
        
        // Check for cards in the next frame's events
        const nextFrame = simulationResult.timeline[nextTick];
        if (nextFrame?.events.length > 0) {
          for (const event of nextFrame.events) {
            const card = findCardFromEvent(event);
            if (card) {
              // Clear previous timeout if exists
              if (activeCardTimeoutRef.current) {
                clearTimeout(activeCardTimeoutRef.current);
              }
              setActiveCard(card);
              // Clear after 1.5 seconds
              activeCardTimeoutRef.current = setTimeout(() => setActiveCard(null), 1500);
              break; // Only show one card per tick
            }
          }
        }
        
        return nextTick;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, currentTick, simulationResult.timeline]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (activeCardTimeoutRef.current) {
        clearTimeout(activeCardTimeoutRef.current);
      }
    };
  }, []);

  // Screen shake and critical FX on critical hits
  useEffect(() => {
    if (criticalAction === 'rocket_hit') {
      // Screen flash
      setCriticalFlash(true);
      setTimeout(() => setCriticalFlash(false), 100);
      
      // Floating text
      setCriticalText('CRITICAL!');
      setTimeout(() => setCriticalText(null), 1000);
      
      // Screen shake
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 300);
      
      // Sound trigger
      playSound('critical');
    }
    
    if (criticalAction === 'tower_down') {
      setCriticalFlash(true);
      setTimeout(() => setCriticalFlash(false), 100);
      setCriticalText('TOWER DOWN!');
      setTimeout(() => setCriticalText(null), 1200);
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 300);
      playSound('tower_down');
    }
  }, [currentTick, criticalAction, playSound]);

  // Ghost bar effect - detect HP changes and animate ghost bar with delay
  useEffect(() => {
    if (userHp < prevUserHp) {
      // User took damage - shake bar and delay ghost
      setUserBarShake(true);
      setTimeout(() => setUserBarShake(false), 300);
      setTimeout(() => setGhostUserHp(userHp), 500);
      playSound('hit');
    }
    setPrevUserHp(userHp);
  }, [userHp]);

  useEffect(() => {
    if (proHp < prevProHp) {
      // Pro took damage - shake bar and delay ghost
      setProBarShake(true);
      setTimeout(() => setProBarShake(false), 300);
      setTimeout(() => setGhostProHp(proHp), 500);
      playSound('hit');
    }
    setPrevProHp(proHp);
  }, [proHp]);

  // Elixir regeneration: ~2.8 seconds per elixir, starts at 5
  useEffect(() => {
    const elixirPerTick = 1 / 2.8;
    const newElixir = Math.min(10, 5 + (currentTick * elixirPerTick));
    setUserElixir(Math.floor(newElixir * 10) / 10);
    setProElixir(Math.floor(newElixir * 10) / 10);
  }, [currentTick]);

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

  const timeRemaining = 180 - currentTick;
  const isTimerCritical = timeRemaining <= 10 && timeRemaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "fixed inset-0 z-50 overflow-hidden",
        shakeScreen && "animate-[shake_0.3s_ease-in-out]"
      )}
      style={{
        ['--shake-x' as string]: '4px',
      }}
    >
      {/* Arena Background Image - Remote placeholder */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')",
          filter: 'blur(4px)'
        }}
      />
      
      {/* Heavy Dark Overlay for readability */}
      <div className="absolute inset-0 bg-black/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      
      {/* Floating Particles */}
      <div className="arena-floating-particles">
        <span /><span /><span /><span /><span /><span /><span /><span />
      </div>

      {/* Content Container */}
      <div className="relative z-10 h-full flex items-center justify-center p-4">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white/70 hover:text-white hover:bg-white/10"
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
            <span className={cn(
              "text-3xl mt-2 tabular-nums arena-timer",
              isTimerCritical && "arena-timer-critical"
            )}>
              {formatMatchTime(timeRemaining)}
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

        {/* Health Bars - Glassmorphism Container */}
        <div className="space-y-3 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
          {/* User HP */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-emerald font-medium">{t('dreamArena.you', 'You')}</span>
              <span className="text-muted-foreground font-mono">{userHp} / {TOWER_HP}</span>
            </div>
            <div className={cn(
              "h-8 rounded-full bg-black/60 border border-emerald/30 overflow-hidden relative",
              getHpBorderGlow(userHp, 'user'),
              userBarShake && "hp-bar-shake"
            )}>
              {/* Ghost bar (white, behind main bar) */}
              <motion.div
                className="absolute h-full bg-white/30 rounded-full"
                animate={{ width: `${(ghostUserHp / TOWER_HP) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {/* Main colored bar (drops immediately) */}
              <motion.div
                className={cn("absolute h-full rounded-full bg-gradient-to-r transition-all duration-100", getHpColor(userHp))}
                style={{ width: `${(userHp / TOWER_HP) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md z-10">
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
              getHpBorderGlow(proHp, 'pro'),
              proBarShake && "hp-bar-shake"
            )}>
              {/* Ghost bar (white, behind main bar) */}
              <motion.div
                className="absolute h-full bg-white/30 rounded-full"
                animate={{ width: `${(ghostProHp / TOWER_HP) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {/* Main colored bar (drops immediately) */}
              <motion.div
                className={cn("absolute h-full rounded-full bg-gradient-to-r transition-all duration-100", getHpColor(proHp))}
                style={{ width: `${(proHp / TOWER_HP) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md z-10">
                {Math.round((proHp / TOWER_HP) * 100)}%
              </span>
            </div>
          </div>
          
          {/* Elixir Bars */}
          <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
            {/* User Elixir */}
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 h-5 rounded-full bg-black/60 border border-primary/30 overflow-hidden relative">
                <motion.div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r from-primary via-violet-500 to-primary",
                    userElixir >= 10 && "elixir-bar-full"
                  )}
                  animate={{ width: `${(userElixir / 10) * 100}%` }}
                  transition={{ duration: 0.3, ease: "linear" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                  {Math.floor(userElixir)} / 10
                </span>
              </div>
            </div>
            
            {/* Pro Elixir */}
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-crimson shrink-0" />
              <div className="flex-1 h-5 rounded-full bg-black/60 border border-crimson/30 overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-crimson via-pink-500 to-crimson"
                  animate={{ width: `${(proElixir / 10) * 100}%` }}
                  transition={{ duration: 0.3, ease: "linear" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                  {Math.floor(proElixir)} / 10
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Log - Glassmorphism Container */}
        <div className="space-y-2 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
          <h3 className="text-sm font-semibold text-white/80">{t('dreamArena.battleLog', 'Battle Log')}</h3>
          <ScrollArea className="h-48 rounded-lg bg-black/30 border border-white/5 p-3">
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

        {/* Controls - Glassmorphism Container */}
        <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-xl">
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
      </div>

      {/* Critical Hit Screen Flash */}
      <AnimatePresence>
        {criticalFlash && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-35 bg-destructive/20 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Critical Text Overlay */}
      <AnimatePresence>
        {criticalText && (
          <motion.div
            key={criticalText}
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ 
              scale: [0.5, 1.3, 1.1],
              opacity: 1,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-45 flex items-center justify-center pointer-events-none"
          >
            <span 
              className="critical-text-shake text-6xl font-black text-white uppercase tracking-wider"
              style={{
                textShadow: '0 0 20px hsl(var(--destructive) / 0.8), 0 0 40px hsl(var(--destructive) / 0.6), 0 4px 0 hsl(var(--destructive))'
              }}
            >
              {criticalText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Spotlight Overlay */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            key={activeCard.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            {/* Rotating Burst Effect - Layer 1 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 2, 2.5],
                opacity: [0, 0.8, 0],
                rotate: [0, 45, 90]
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute w-80 h-80"
              style={{
                background: 'conic-gradient(from 0deg, transparent, hsl(var(--gold) / 0.6), transparent, hsl(var(--primary) / 0.4), transparent)',
              }}
            />
            
            {/* Pulsing Radial Glow - Layer 2 */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.5, 2, 2.5],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute w-64 h-64 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsl(var(--gold) / 0.6), hsl(var(--primary) / 0.3), transparent)'
              }}
            />

            {/* Starburst Rays - Layer 3 */}
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: 0 }}
              animate={{ 
                scale: [0, 1.5, 1.8],
                opacity: [0, 0.6, 0],
                rotate: [0, -30, -60]
              }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute w-96 h-96 spotlight-burst"
            />
            
            {/* Card Container with Pop Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -15, opacity: 0 }}
              animate={{ 
                scale: [0, 1.3, 1.1], 
                rotate: [-15, 5, 0],
                opacity: 1 
              }}
              exit={{ scale: 0.8, opacity: 0, rotate: 10 }}
              transition={{ 
                duration: 0.4, 
                ease: "easeOut",
                times: [0, 0.6, 1]
              }}
              className="relative"
            >
              {/* Card Glow Effect */}
              <motion.div 
                className="absolute -inset-6 blur-2xl rounded-3xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 0.8, 0.6]
                }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  background: 'radial-gradient(circle, hsl(var(--gold) / 0.5), hsl(var(--gold) / 0.2), transparent)'
                }}
              />
              
              {/* Card Image */}
              <div className="relative w-40 h-52 rounded-xl overflow-hidden border-4 border-gold shadow-[0_0_40px_hsl(var(--gold)/0.6)]">
                <img
                  src={activeCard.iconUrls?.medium}
                  alt={activeCard.name}
                  className="w-full h-full object-cover bg-black/50"
                />
                
                {/* Card Name Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <p className="text-center text-white font-bold text-lg drop-shadow-lg">
                    {activeCard.name}
                  </p>
                  {activeCard.elixirCost && (
                    <div className="flex justify-center mt-1">
                      <span className="bg-primary text-primary-foreground text-sm font-bold px-3 py-0.5 rounded-full">
                        {activeCard.elixirCost} Elixir
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
