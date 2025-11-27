import { createContext, useContext, useState, ReactNode } from 'react';
import { ClashRoyaleBattle } from '@/services/clashRoyaleApi';

interface MatchAnalysis {
  analysis: string;
  deckMatchup: string;
  recommendations: string[];
}

interface MatchDiscussionData {
  battle: ClashRoyaleBattle;
  playerTag: string;
  analysis?: MatchAnalysis;
  isWin: boolean;
  playerCrowns: number;
  opponentCrowns: number;
  trophyChange: number;
}

interface MatchDiscussionContextType {
  matchContext: MatchDiscussionData | null;
  setMatchContext: (data: MatchDiscussionData | null) => void;
  clearMatchContext: () => void;
}

const MatchDiscussionContext = createContext<MatchDiscussionContextType | undefined>(undefined);

export function MatchDiscussionProvider({ children }: { children: ReactNode }) {
  const [matchContext, setMatchContext] = useState<MatchDiscussionData | null>(null);

  const clearMatchContext = () => setMatchContext(null);

  return (
    <MatchDiscussionContext.Provider value={{ matchContext, setMatchContext, clearMatchContext }}>
      {children}
    </MatchDiscussionContext.Provider>
  );
}

export function useMatchDiscussion() {
  const context = useContext(MatchDiscussionContext);
  if (context === undefined) {
    throw new Error('useMatchDiscussion must be used within a MatchDiscussionProvider');
  }
  return context;
}
