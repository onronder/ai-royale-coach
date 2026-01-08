import { useState, useEffect, useCallback } from 'react';
import { Search, Clipboard, AlertTriangle, Target, Zap, Shield, Swords, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardImage } from '@/components/cards/CardImage';
import { useOraclePrediction } from '@/hooks/useOraclePrediction';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ClashRoyaleCard } from '@/services/clashRoyaleApi';

interface OracleScannerProps {
  initialOpponentTag?: string;
  userPlayerTag?: string;
  userCurrentDeck?: ClashRoyaleCard[];
}

interface MatchupPrediction {
  deckAWinRate: number;
  deckBWinRate: number;
  confidence: string;
  explanation?: string;
  tips?: {
    forDeckA?: string[];
    forDeckB?: string[];
  };
}

// Glitch text effect hook
function useGlitchText(targetText: string, isActive: boolean, duration = 2000) {
  const [displayText, setDisplayText] = useState(targetText);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

  useEffect(() => {
    if (!isActive) {
      setDisplayText(targetText);
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        targetText
          .split('')
          .map((char, index) => {
            if (index < iteration) return targetText[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= targetText.length) {
        clearInterval(interval);
      }
      iteration += 1 / 3;
    }, 30);

    return () => clearInterval(interval);
  }, [isActive, targetText]);

  return displayText;
}

// Circular progress component
function ConfidenceMeter({ value, size = 120 }: { value: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value >= 70 ? 'hsl(var(--destructive))' : value >= 40 ? 'hsl(var(--gold))' : 'hsl(var(--emerald))'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
            filter: 'drop-shadow(0 0 6px currentColor)',
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color: value >= 70 ? 'hsl(var(--destructive))' : value >= 40 ? 'hsl(var(--gold))' : 'hsl(var(--emerald))' }}
        >
          {value}%
        </motion.span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Confidence
        </span>
      </div>
    </div>
  );
}

// Scanning animation
function ScanningOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
        initial={{ top: 0 }}
        animate={{ top: '100%' }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ boxShadow: '0 0 20px 5px hsl(var(--emerald) / 0.5)' }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--emerald) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--emerald) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
    </motion.div>
  );
}

export function OracleScanner({ 
  initialOpponentTag = '', 
  userPlayerTag = '',
  userCurrentDeck 
}: OracleScannerProps) {
  const [opponentTag, setOpponentTag] = useState(initialOpponentTag);
  const [searchTag, setSearchTag] = useState<string | null>(null);
  const [matchupPrediction, setMatchupPrediction] = useState<MatchupPrediction | null>(null);
  const [isLoadingMatchup, setIsLoadingMatchup] = useState(false);

  const { data: prediction, isLoading, error } = useOraclePrediction(searchTag);

  const scanningText = useGlitchText('DECRYPTING ENEMY DATA...', isLoading);
  const threatText = useGlitchText('THREAT DETECTED', !!prediction && !isLoading);

  // Auto-trigger search when pre-filled tag is provided
  useEffect(() => {
    if (initialOpponentTag && initialOpponentTag.length >= 3) {
      setOpponentTag(initialOpponentTag);
      setSearchTag(initialOpponentTag);
    }
  }, [initialOpponentTag]);

  // Auto-trigger matchup prediction when both decks are available
  useEffect(() => {
    if (prediction && userCurrentDeck && userCurrentDeck.length === 8 && !matchupPrediction && !isLoadingMatchup) {
      predictMatchup();
    }
  }, [prediction, userCurrentDeck]);

  const predictMatchup = async () => {
    if (!prediction || !userCurrentDeck || userCurrentDeck.length !== 8) return;
    
    setIsLoadingMatchup(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoadingMatchup(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('predict-deck-matchup', {
        body: {
          deckA: userCurrentDeck.map(c => c.name),
          deckB: prediction.likelyDeck.map(c => c.name),
          playerTag: userPlayerTag
        }
      });
      
      if (!error && data) {
        setMatchupPrediction({
          deckAWinRate: data.predicted_win_rate_a || data.predictedWinRateA || 50,
          deckBWinRate: data.predicted_win_rate_b || data.predictedWinRateB || 50,
          confidence: data.confidence || 'medium',
          explanation: data.explanation,
          tips: data.tips
        });
      }
    } catch (err) {
      console.error('Matchup prediction failed:', err);
    } finally {
      setIsLoadingMatchup(false);
    }
  };

  const handleSearch = useCallback(() => {
    const cleanTag = opponentTag.trim().replace(/^#/, '').toUpperCase();
    if (cleanTag.length >= 3) {
      setSearchTag(cleanTag);
      setMatchupPrediction(null); // Reset matchup on new search
    }
  }, [opponentTag]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOpponentTag(text.trim());
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Find highest damage card for the analysis text
  const highDamageCard = prediction?.likelyDeck.reduce((max, card) => {
    const cost = card.elixirCost || 0;
    return cost > (max?.elixirCost || 0) ? card : max;
  }, prediction.likelyDeck[0]);

  return (
    <div className="relative w-full max-w-md mx-auto p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-emerald-950/20 rounded-xl -z-10" />
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-emerald-400 font-mono">
            The Oracle
          </h2>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Enemy Deck Prediction System
        </p>
      </div>

      {/* Input Area */}
      <div className="relative mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={opponentTag}
              onChange={(e) => setOpponentTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter opponent tag..."
              className={cn(
                'pl-10 font-mono uppercase bg-background/50 border-emerald-900/50',
                'focus:border-emerald-500 focus:ring-emerald-500/20',
                'placeholder:text-muted-foreground/50 placeholder:normal-case'
              )}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePaste}
            className="border-emerald-900/50 hover:bg-emerald-900/20 hover:border-emerald-500"
            title="Paste from clipboard"
          >
            <Clipboard className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSearch}
            disabled={opponentTag.length < 3 || isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono uppercase tracking-wider"
          >
            Scan
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-[300px] rounded-lg border border-emerald-900/30 bg-black/40 backdrop-blur-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6"
            >
              <ScanningOverlay />
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-emerald-400 font-mono text-sm tracking-wider mb-4"
              >
                {scanningText}
              </motion.div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !prediction && !error && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Target className="w-16 h-16 text-emerald-900 mb-4" />
              </motion.div>
              <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
                Awaiting Target Coordinates...
              </p>
              <p className="text-muted-foreground/50 text-xs mt-2">
                Enter an opponent's player tag to predict their deck
              </p>
            </motion.div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
            >
              <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-destructive font-mono text-sm uppercase tracking-wider">
                Target Not Found
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Could not retrieve battle data for this player
              </p>
            </motion.div>
          )}

          {/* Result View */}
          {!isLoading && prediction && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4"
            >
              {/* Threat Header */}
              <div className="text-center mb-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-destructive/10 border border-destructive/30"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="font-mono text-sm font-bold tracking-wider text-destructive">
                    {threatText}
                  </span>
                </motion.div>
              </div>

              {/* Confidence & Stats Row */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <ConfidenceMeter value={prediction.confidence} size={100} />
                <div className="text-left space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Zap className="w-3 h-3 text-gold" />
                    <span className="text-muted-foreground">Playstyle:</span>
                    <span className={cn(
                      'font-mono font-bold',
                      prediction.playstyle === 'Aggressive' ? 'text-destructive' : 'text-royal'
                    )}>
                      {prediction.playstyle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span className="text-muted-foreground">Last seen:</span>
                    <span className="font-mono text-foreground">{prediction.lastPlayedAgo}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {prediction.matchCount}/{prediction.totalMatches} matches analyzed
                  </div>
                </div>
              </div>

              {/* Predicted Deck Grid */}
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 text-center">
                  Predicted Deck
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {prediction.likelyDeck.map((card, index) => (
                    <motion.div
                      key={card.id || index}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative aspect-[3/4] rounded overflow-hidden border border-emerald-900/30 bg-black/20"
                    >
                      <CardImage card={card} size="sm" showLevel={false} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Analysis Text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center p-3 rounded bg-emerald-950/30 border border-emerald-900/20"
              >
                <p className="text-xs text-muted-foreground">
                  Opponent prefers playing this deck{' '}
                  <span className={prediction.playstyle === 'Aggressive' ? 'text-destructive' : 'text-royal'}>
                    {prediction.playstyle.toLowerCase()}ly
                  </span>
                  .{' '}
                  {highDamageCard && (
                    <>
                      Watch out for{' '}
                      <span className="text-gold font-medium">{highDamageCard.name}</span>.
                    </>
                  )}
                </p>
              </motion.div>

              {/* Auto Matchup Prediction */}
              {userCurrentDeck && userCurrentDeck.length === 8 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 border-t border-emerald-900/30 pt-4"
                >
                  <div className="text-center mb-3">
                    <Badge variant="outline" className="border-gold/50 text-gold">
                      <Swords className="w-3 h-3 mr-1" />
                      Matchup Analysis
                    </Badge>
                  </div>
                  
                  {isLoadingMatchup ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="ml-2 text-sm text-muted-foreground">Analyzing matchup...</span>
                    </div>
                  ) : matchupPrediction ? (
                    <div className="space-y-3">
                      {/* Win Rate Bars */}
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-emerald-950/30 rounded p-2">
                          <div className="text-lg font-bold text-emerald-400">
                            {matchupPrediction.deckAWinRate}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">Your Deck</div>
                        </div>
                        <div className="bg-red-950/30 rounded p-2">
                          <div className="text-lg font-bold text-destructive">
                            {matchupPrediction.deckBWinRate}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">Opponent</div>
                        </div>
                      </div>
                      
                      {/* Matchup Verdict */}
                      <div className="text-center text-sm">
                        {matchupPrediction.deckAWinRate > 55 ? (
                          <span className="text-success">Favorable matchup!</span>
                        ) : matchupPrediction.deckAWinRate < 45 ? (
                          <span className="text-destructive">Challenging matchup</span>
                        ) : (
                          <span className="text-gold">Even matchup</span>
                        )}
                      </div>
                      
                      {/* Tips */}
                      {matchupPrediction.tips?.forDeckA && matchupPrediction.tips.forDeckA.length > 0 && (
                        <div className="text-[10px] text-muted-foreground bg-background/30 rounded p-2">
                          <div className="font-medium mb-1">Quick Tips:</div>
                          <ul className="list-disc list-inside space-y-0.5">
                            {matchupPrediction.tips.forDeckA.slice(0, 2).map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Sign in to see matchup analysis
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
