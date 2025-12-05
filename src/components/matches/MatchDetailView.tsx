import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataLoader } from "@/components/ui/data-loader";
import { Trophy, Crown, Swords, Sparkles, MessageSquare, Zap, Shield, Clock, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useMatchDiscussion } from "@/contexts/MatchDiscussionContext";
import { CounterDeckModal } from "@/components/deck/CounterDeckModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "@/components/subscription/PricingModal";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

interface MatchDetailViewProps {
  battle: ClashRoyaleBattle | null;
  playerTag: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCoach?: () => void;
}

interface PivotalInteraction {
  yourCard: string;
  opponentCard: string;
  phase: 'early' | 'mid' | 'late' | 'overtime';
  description: string;
  impact: 'high' | 'medium';
}

interface CounterDeckSuggestion {
  cards: string[];
  explanations: Record<string, string>;
  overallStrategy: string;
}

interface MatchAnalysis {
  analysis: string;
  deckMatchup: string;
  recommendations: string[];
  pivotalInteractions?: PivotalInteraction[];
  counterDeck?: CounterDeckSuggestion | null;
}

// Card name to image URL helper
function getCardImageUrl(cardName: string): string {
  const slug = cardName
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://api-assets.clashroyale.com/cards/300/${slug}.png`;
}

// Card icon component with fallback
function CardIcon({ cardName, className }: { cardName: string; className?: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <div className={cn("bg-muted rounded flex items-center justify-center text-xs font-medium", className)}>
        {cardName.charAt(0)}
      </div>
    );
  }
  
  return (
    <img
      src={getCardImageUrl(cardName)}
      alt={cardName}
      className={cn("rounded object-cover", className)}
      onError={() => setHasError(true)}
    />
  );
}

// Trophy celebration component
function TrophyCelebration({ trophyChange }: { trophyChange: number }) {
  if (trophyChange <= 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-trophy-float"
          style={{
            left: `${15 + i * 18}%`,
            animationDelay: `${i * 0.15}s`,
          }}
        >
          <Trophy className="w-5 h-5 text-gold drop-shadow-lg" />
        </div>
      ))}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Sparkles className="w-8 h-8 text-gold animate-pulse" />
      </div>
    </div>
  );
}

// Confetti burst for 3-crown victories
function ConfettiBurst() {
  const colors = ['#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80', '#A855F7', '#F97316'];
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${1.5 + Math.random() * 1}s`,
          }}
        >
          <div 
            className="w-2 h-2 rounded-sm"
            style={{ 
              backgroundColor: colors[i % colors.length],
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 animate-crown-burst">
        <Crown className="w-12 h-12 text-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
      </div>
    </div>
  );
}

// Phase badge colors and timeline positions
const phaseColors = {
  early: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  mid: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  late: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  overtime: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const phaseDotColors = {
  early: 'bg-blue-500',
  mid: 'bg-yellow-500',
  late: 'bg-orange-500',
  overtime: 'bg-red-500',
};

const phasePositions = {
  early: '12.5%',
  mid: '37.5%',
  late: '62.5%',
  overtime: '87.5%',
};

// Match Timeline visualization
function MatchTimeline({ interactions, t }: { interactions: PivotalInteraction[]; t: (key: string) => string }) {
  if (!interactions || interactions.length === 0) return null;

  // Group interactions by phase
  const phases = ['early', 'mid', 'late', 'overtime'] as const;
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        {t('matchDetail.matchTimeline')}
      </h3>
      <div className="relative bg-card/50 rounded-lg border p-4">
        {/* Timeline bar */}
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-blue-500/30" />
            <div className="flex-1 bg-yellow-500/30" />
            <div className="flex-1 bg-orange-500/30" />
            <div className="flex-1 bg-red-500/30" />
          </div>
        </div>
        
        {/* Phase labels */}
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[10px] text-blue-400">{t('matchDetail.phases.early')}</span>
          <span className="text-[10px] text-yellow-400">{t('matchDetail.phases.mid')}</span>
          <span className="text-[10px] text-orange-400">{t('matchDetail.phases.late')}</span>
          <span className="text-[10px] text-red-400">{t('matchDetail.phases.overtime')}</span>
        </div>
        
        {/* Interaction dots on timeline */}
        <div className="relative h-16 mt-4">
          <TooltipProvider>
            {interactions.map((interaction, idx) => {
              // Offset within phase for multiple interactions in same phase
              const samePhaseCount = interactions.filter((i, j) => j < idx && i.phase === interaction.phase).length;
              const offsetY = samePhaseCount * 20;
              
              return (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "absolute flex items-center gap-1 cursor-pointer transition-all hover:scale-110",
                        "animate-fade-in"
                      )}
                      style={{ 
                        left: phasePositions[interaction.phase],
                        top: `${offsetY}px`,
                        transform: 'translateX(-50%)',
                        animationDelay: `${idx * 100}ms`
                      }}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 overflow-hidden",
                        interaction.impact === 'high' 
                          ? "border-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
                          : "border-muted-foreground/50"
                      )}>
                        <CardIcon cardName={interaction.yourCard} className="w-full h-full" />
                      </div>
                      <Swords className="w-3 h-3 text-muted-foreground" />
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 overflow-hidden",
                        "border-destructive/50"
                      )}>
                        <CardIcon cardName={interaction.opponentCard} className="w-full h-full" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs", phaseColors[interaction.phase])}>
                          {interaction.phase.charAt(0).toUpperCase() + interaction.phase.slice(1)}
                        </Badge>
                        {interaction.impact === 'high' && (
                          <Badge className="bg-primary/20 text-primary text-xs">{t('matchDetail.highImpact')}</Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium">
                        {interaction.yourCard} vs {interaction.opponentCard}
                      </p>
                      <p className="text-xs text-muted-foreground">{interaction.description}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

// Key Moments component with card icons
function KeyMoments({ interactions, t }: { interactions: PivotalInteraction[]; t: (key: string) => string }) {
  if (!interactions || interactions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        {t('matchDetail.keyMoments')}
      </h3>
      <div className="grid gap-3">
        {interactions.map((interaction, idx) => (
          <div 
            key={idx}
            className={cn(
              "p-3 rounded-lg border bg-card/50 transition-all hover:bg-card",
              interaction.impact === 'high' && "ring-1 ring-primary/50 shadow-[0_0_10px_rgba(var(--primary),0.2)]"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-xs", phaseColors[interaction.phase])}>
                  {t(`matchDetail.phases.${interaction.phase}`)} {t('matchDetail.game')}
                </Badge>
                {interaction.impact === 'high' && (
                  <Badge className="bg-primary/20 text-primary text-xs">{t('matchDetail.highImpact')}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              {/* Your Card with Icon */}
              <div className="flex items-center gap-2 px-2 py-1 bg-success/20 rounded">
                <CardIcon cardName={interaction.yourCard} className="w-8 h-8" />
                <span className="text-success text-sm font-medium">{interaction.yourCard}</span>
              </div>
              <Swords className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {/* Opponent Card with Icon */}
              <div className="flex items-center gap-2 px-2 py-1 bg-destructive/20 rounded">
                <CardIcon cardName={interaction.opponentCard} className="w-8 h-8" />
                <span className="text-destructive text-sm font-medium">{interaction.opponentCard}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{interaction.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchDetailView({ battle, playerTag, open, onOpenChange, onOpenCoach }: MatchDetailViewProps) {
  const { t, i18n } = useTranslation();
  const { hasAccess } = useSubscription();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [counterDeckOpen, setCounterDeckOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const { setMatchContext } = useMatchDiscussion();
  
  // Normalize player tag - ensure it has # prefix
  const normalizedPlayerTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
  
  // Compute player/opponent data early (before hooks)
  const playerTeam = battle?.team.find(p => p.tag === normalizedPlayerTag);
  const opponent = battle?.opponent[0];
  const isWin = playerTeam && opponent ? playerTeam.crowns > opponent.crowns : false;
  const trophyChange = playerTeam?.trophyChange || 0;

  // IMPORTANT: useQuery MUST be called unconditionally (before any returns)
  const { data: analysis, isLoading, error: analysisError } = useQuery({
    queryKey: ['match-analysis', battle?.battleTime, normalizedPlayerTag, i18n.language],
    queryFn: async () => {
      if (!battle) throw new Error('No battle data');
      
      // Check subscription before making AI call
      if (!hasAccess) {
        throw new Error('SUBSCRIPTION_REQUIRED');
      }
      
      const { data, error } = await supabase.functions.invoke('analyze-match', {
        body: { battle, playerTag: normalizedPlayerTag, language: i18n.language }
      });
      
      // Check for subscription_required in response
      if ((data as any)?.subscription_required) {
        throw new Error('SUBSCRIPTION_REQUIRED');
      }
      
      if (error) {
        // Check if it's an auth error
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          throw new Error('AUTH_REQUIRED');
        }
        // Check if subscription required
        if (error.message?.includes('403') || error.message?.includes('subscription')) {
          throw new Error('SUBSCRIPTION_REQUIRED');
        }
        throw error;
      }
      return data as MatchAnalysis;
    },
    enabled: open && !!battle && hasAccess,
    staleTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry auth or subscription errors
      if (error instanceof Error && (error.message === 'AUTH_REQUIRED' || error.message === 'SUBSCRIPTION_REQUIRED')) return false;
      return failureCount < 2;
    },
  });
  
  const requiresSubscription = analysisError instanceof Error && analysisError.message === 'SUBSCRIPTION_REQUIRED';

  useEffect(() => {
    if (open && battle && playerTeam) {
      const crowns = playerTeam.crowns;
      const opponentCrowns = opponent?.crowns || 0;
      const matchIsWin = crowns > opponentCrowns;
      
      if (matchIsWin && crowns === 3) {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
      } else if ((playerTeam.trophyChange || 0) > 0) {
        setShowCelebration(true);
        const timer = setTimeout(() => setShowCelebration(false), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [open, battle, playerTeam, opponent]);

  // Handle "Discuss with Coach" click
  const handleDiscussWithCoach = () => {
    if (!battle || !playerTeam || !opponent) return;
    
    setMatchContext({
      battle,
      playerTag: normalizedPlayerTag,
      analysis: analysis || undefined,
      isWin,
      playerCrowns: playerTeam.crowns,
      opponentCrowns: opponent.crowns,
      trophyChange,
    });
    
    onOpenChange(false);
    onOpenCoach?.();
  };

  // Early returns AFTER all hooks
  if (!battle) return null;
  if (!playerTeam || !opponent) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {showConfetti && <ConfettiBurst />}
          {showCelebration && <TrophyCelebration trophyChange={trophyChange} />}
          
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Badge variant={isWin ? "default" : "destructive"} className="text-base">
                {isWin ? t('matchDetail.victory') : t('matchDetail.defeat')}
              </Badge>
              <span className="text-muted-foreground">{battle.gameMode.name}</span>
            </DialogTitle>
            <DialogDescription>
              {t('matchDetail.description', { opponent: opponent.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Battle Summary */}
            <div className={cn(
              "grid grid-cols-3 gap-4 p-4 rounded-lg relative overflow-hidden transition-all",
              isWin ? "bg-success/10 border border-success/20" : "bg-muted"
            )}>
              <div className="text-center">
                <Crown className={cn("w-6 h-6 mx-auto mb-1", isWin ? "text-gold" : "text-primary")} />
                <p className="text-2xl font-bold font-rajdhani">{playerTeam.crowns} - {opponent.crowns}</p>
                <p className="text-xs text-muted-foreground">{t('matchDetail.crowns')}</p>
              </div>
              {trophyChange !== 0 && (
                <div className="text-center">
                  <Trophy className={cn(
                    "w-6 h-6 mx-auto mb-1",
                    trophyChange > 0 ? "text-gold trophy-shimmer" : "text-destructive"
                  )} />
                  <p className={cn(
                    "text-2xl font-bold",
                    trophyChange > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {trophyChange > 0 ? '+' : ''}{trophyChange}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('matchDetail.trophies')}</p>
                </div>
              )}
              <div className="text-center">
                <Swords className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-sm font-medium">{battle.arena.name}</p>
                <p className="text-xs text-muted-foreground">{t('matchDetail.arena')}</p>
              </div>
            </div>

            {/* Decks Comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-green-500">●</span> {t('matchDetail.yourDeck')}
                </h3>
                <DeckGrid cards={playerTeam.cards} size="sm" />
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-red-500">●</span> {t('matchDetail.opponentDeck', { name: opponent.name })}
                </h3>
                <DeckGrid cards={opponent.cards} size="sm" />
              </div>
            </div>

            {/* AI Analysis */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t('matchDetail.matchAnalysis')}</h3>
              {!hasAccess ? (
                <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg text-center space-y-3">
                  <Lock className="w-8 h-8 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">{t('subscription.featureRequiresPro', { feature: t('subscription.features.matchupAnalysis') })}</p>
                  <Button onClick={() => setShowPricingModal(true)} size="sm">
                    {t('subscription.upgradeToPro')}
                  </Button>
                </div>
              ) : isLoading ? (
                <DataLoader context="match-analysis" variant="inline" />
              ) : analysisError ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  {analysisError.message === 'AUTH_REQUIRED' ? (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">{t('matchDetail.signInRequired')}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = '/auth?mode=signin'}
                      >
                        {t('nav.signIn')}
                      </Button>
                    </div>
                  ) : requiresSubscription ? (
                    <div className="text-center space-y-2">
                      <Lock className="w-6 h-6 text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">{t('subscription.featureRequiresPro', { feature: t('subscription.features.matchupAnalysis') })}</p>
                      <Button onClick={() => setShowPricingModal(true)} size="sm">
                        {t('subscription.upgradeToPro')}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">{t('matchDetail.analysisFailed')}</p>
                  )}
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  <div className="p-4 bg-card rounded-lg border">
                    <h4 className="font-medium mb-2 text-primary">{t('matchDetail.deckMatchup')}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.deckMatchup}</p>
                  </div>
                  <div className="p-4 bg-card rounded-lg border">
                    <h4 className="font-medium mb-2 text-primary">{t('matchDetail.analysis')}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.analysis}</p>
                  </div>
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="p-4 bg-card rounded-lg border">
                      <h4 className="font-medium mb-2 text-primary">{t('matchDetail.recommendations')}</h4>
                      <ul className="space-y-1">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-primary">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Feedback for match analysis */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">{t('feedback.rateResponse')}</span>
                    <FeedbackButton
                      playerTag={normalizedPlayerTag}
                      feedbackType="match_analysis"
                      referenceId={battle.battleTime}
                      context={{ 
                        isWin, 
                        gameMode: battle.gameMode.name,
                        trophyChange 
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Match Timeline */}
            {analysis?.pivotalInteractions && analysis.pivotalInteractions.length > 0 && (
              <MatchTimeline interactions={analysis.pivotalInteractions} t={t} />
            )}

            {/* Key Moments */}
            {analysis?.pivotalInteractions && analysis.pivotalInteractions.length > 0 && (
              <KeyMoments interactions={analysis.pivotalInteractions} t={t} />
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={handleDiscussWithCoach}
                  className="bg-gradient-to-r from-primary to-accent hover:shadow-glow transition-all"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('matchDetail.discussWithCoach')}
                </Button>
                
                {analysis?.counterDeck && analysis.counterDeck.cards.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => setCounterDeckOpen(true)}
                    className="border-primary/50 hover:bg-primary/10"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t('matchDetail.buildCounterDeck')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t('matchDetail.actionHint')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Counter Deck Modal */}
      {analysis?.counterDeck && (
        <CounterDeckModal
          open={counterDeckOpen}
          onOpenChange={setCounterDeckOpen}
          counterDeck={analysis.counterDeck}
          opponentDeck={opponent.cards}
          opponentName={opponent.name}
        />
      )}

      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </>
  );
}
