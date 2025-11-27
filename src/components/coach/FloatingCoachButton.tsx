import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoachChatPanel } from './CoachChatPanel';
import { useMatchDiscussion } from '@/contexts/MatchDiscussionContext';

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
  savedDecks?: any[];
  cardMastery?: any[];
  achievements?: any[];
  cardCollection?: any[];
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
  const [isOpen, setIsOpen] = useState(false);
  const { matchContext, clearMatchContext } = useMatchDiscussion();
  
  // Normalize playerTag to ensure consistent format (with #)
  const normalizedPlayerTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;

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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
    
    // Clear match context when closing
    if (!open && matchContext) {
      clearMatchContext();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => handleOpenChange(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "h-14 w-14 rounded-full",
            "bg-gradient-to-br from-primary to-accent",
            "shadow-xl hover:shadow-2xl",
            "transition-all duration-300",
            "hover:scale-110",
            "animate-pulse-glow"
          )}
          size="icon"
        >
          <MessageSquare className="h-6 w-6 text-primary-foreground" />
        </Button>
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
      />
    </>
  );
}
