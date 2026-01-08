import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Crown, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoachChatPanel } from './CoachChatPanel';
import { useMatchDiscussion } from '@/contexts/MatchDiscussionContext';
import { useProactiveRecommendations } from '@/hooks/useProactiveRecommendations';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FeatureUsageIndicator } from '@/components/common/FeatureUsageIndicator';
import { PricingModal } from '@/components/subscription/PricingModal';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { 
  SavedDeckRow, 
  CardMasteryRow, 
  UserAchievementWithDetails, 
  CardCollectionRow 
} from "@/types/dashboard.types";

interface FloatingCoachButtonProps {
  playerTag: string;
  playerStats?: {
    trophies: number;
    bestTrophies: number;
    arena: string;
    winRate: number;
  };
  recentMatches?: {
    wins: number;
    losses: number;
    avgTrophyChange: string;
  };
  savedDecks?: SavedDeckRow[];
  cardMastery?: CardMasteryRow[];
  achievements?: UserAchievementWithDetails[];
  cardCollection?: CardCollectionRow[];
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FloatingCoachButton({ 
  playerTag, 
  playerStats, 
  recentMatches,
  savedDecks,
  cardMastery,
  achievements,
  cardCollection,
  forceOpen,
  onOpenChange 
}: FloatingCoachButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const { matchContext, clearMatchContext } = useMatchDiscussion();
  
  // Normalize playerTag to ensure consistent format (with #)
  const normalizedPlayerTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;

  // Feature access control
  const {
    canAccess,
    checkAccess,
    accessResult,
    usageCount,
    dailyLimit,
    remainingUses,
  } = useFeatureAccess('ai_coach', normalizedPlayerTag);

  // Proactive recommendations for struggling players
  const proactiveSuggestion = useProactiveRecommendations({
    playerTag: normalizedPlayerTag,
    trophies: playerStats?.trophies || 5000,
    recentWinRate: playerStats?.winRate || 50,
    totalBattles: (recentMatches?.wins || 0) + (recentMatches?.losses || 0)
  });

  // Handle forceOpen from parent
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
    }
  }, [forceOpen]);

  // Auto-open when match context is set
  useEffect(() => {
    if (matchContext) {
      setIsOpen(true);
    }
  }, [matchContext]);

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      // Check access before opening
      const result = await checkAccess();
      
      if (!result.allowed) {
        if (result.reason === 'fraud_detected') {
          toast.error(result.message || t('subscription.tagClaimedMessage'));
          return;
        }
        if (result.reason === 'quota_exceeded') {
          setShowPricingModal(true);
          toast.warning(t('subscription.dailyLimitReached'));
          return;
        }
        if (result.reason === 'not_authenticated') {
          toast.error(t('auth.signInRequired'));
          return;
        }
      }
    }
    
    setIsOpen(open);
    onOpenChange?.(open);
    
    // Clear match context when closing
    if (!open && matchContext) {
      clearMatchContext();
    }
  };

  // Show proactive suggestion indicator
  const hasProactiveSuggestion = proactiveSuggestion !== null;

  // Determine if we should show usage indicator (for free users)
  const showUsageIndicator = accessResult?.reason === 'daily_free' || accessResult?.reason === 'quota_exceeded';

  return (
    <>
      {/* Floating Button with Proactive Suggestion Indicator */}
      {!isOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="fixed bottom-6 right-6 z-50">
                {/* Proactive suggestion badge */}
                {hasProactiveSuggestion && (
                  <div className="absolute -top-2 -left-2 z-10">
                    <div className="relative">
                      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center animate-bounce">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-950" />
                      </div>
                      <div className="absolute inset-0 h-6 w-6 rounded-full bg-amber-400 animate-ping opacity-75" />
                    </div>
                  </div>
                )}
                
                {/* Usage indicator badge for free users */}
                {showUsageIndicator && !hasProactiveSuggestion && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <FeatureUsageIndicator
                      feature="ai_coach"
                      playerTag={normalizedPlayerTag}
                      variant="tooltip"
                    />
                  </div>
                )}
                
                <Button
                  onClick={() => handleOpenChange(true)}
                  className={cn(
                    "h-14 w-14 rounded-xl",
                    "bg-gradient-gold shadow-gold",
                    "hover:shadow-2xl",
                    "transition-all duration-300",
                    "hover:scale-110",
                    "golden-shine",
                    hasProactiveSuggestion ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background" : "animate-pulse-glow"
                  )}
                  size="icon"
                >
                  <Crown className="h-6 w-6 text-gold-foreground" />
                </Button>
              </div>
            </TooltipTrigger>
            {hasProactiveSuggestion && (
              <TooltipContent side="left" className="max-w-[250px] bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                      {t('recommendations.proactive.title')}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                      {proactiveSuggestion.message}
                    </p>
                  </div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Slide-out Chat Panel */}
      <CoachChatPanel
        isOpen={isOpen}
        onClose={() => handleOpenChange(false)}
        playerTag={normalizedPlayerTag}
        playerStats={playerStats}
        recentMatches={recentMatches}
        savedDecks={savedDecks}
        cardMastery={cardMastery}
        achievements={achievements}
        cardCollection={cardCollection}
        matchContext={matchContext}
        proactiveSuggestion={hasProactiveSuggestion ? proactiveSuggestion : undefined}
      />

      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal}
      />
    </>
  );
}
