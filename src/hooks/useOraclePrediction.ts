import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { clashRoyaleApi, ClashRoyaleCard, ClashRoyaleBattle } from '@/services/clashRoyaleApi';
import { parseClashRoyaleDate } from '@/lib/utils';

export interface OraclePrediction {
  likelyDeck: ClashRoyaleCard[];
  confidence: number;
  lastPlayedAgo: string;
  playstyle: 'Aggressive' | 'Control';
  deckHash: string;
  matchCount: number;
  totalMatches: number;
}

interface DeckUsageData {
  cards: ClashRoyaleCard[];
  count: number;
  lastPlayed: Date;
  isLastMatch: boolean;
}

function getDeckHash(cards: ClashRoyaleCard[]): string {
  return cards
    .map(c => c.name)
    .sort()
    .join('|');
}

function calculateAverageElixir(cards: ClashRoyaleCard[]): number {
  const total = cards.reduce((sum, card) => sum + (card.elixirCost || 0), 0);
  return total / cards.length;
}

function determinePlaystyle(avgElixir: number): 'Aggressive' | 'Control' {
  return avgElixir <= 3.3 ? 'Aggressive' : 'Control';
}

function isLadderMatch(battle: ClashRoyaleBattle): boolean {
  const type = battle.type?.toLowerCase() || '';
  const gameMode = battle.gameMode?.name?.toLowerCase() || '';
  
  return (
    battle.isLadderTournament ||
    type.includes('ladder') ||
    type.includes('pathoflegend') ||
    type.includes('ranked') ||
    gameMode.includes('ladder') ||
    gameMode.includes('path')
  );
}

function analyzeBattleHistory(
  battles: ClashRoyaleBattle[],
  opponentTag: string
): OraclePrediction | null {
  const normalizedTag = opponentTag.replace(/^#/, '').toUpperCase();
  
  // Filter for ladder matches and limit to 25
  const relevantBattles = battles
    .filter(b => isLadderMatch(b) || battles.length <= 10) // Use all if few battles
    .slice(0, 25);
  
  if (relevantBattles.length === 0) {
    return null;
  }
  
  const deckUsage = new Map<string, DeckUsageData>();
  let totalMatches = 0;
  
  relevantBattles.forEach((battle, index) => {
    // Find opponent's deck in this battle (they could be in team or opponent array)
    let opponentDeck: ClashRoyaleCard[] | null = null;
    
    // Check opponent array first
    const opponentEntry = battle.opponent?.find(
      p => p.tag.replace(/^#/, '').toUpperCase() === normalizedTag
    );
    if (opponentEntry) {
      opponentDeck = opponentEntry.cards;
    }
    
    // Check team array if not found
    if (!opponentDeck) {
      const teamEntry = battle.team?.find(
        p => p.tag.replace(/^#/, '').toUpperCase() === normalizedTag
      );
      if (teamEntry) {
        opponentDeck = teamEntry.cards;
      }
    }
    
    if (!opponentDeck || opponentDeck.length !== 8) {
      return;
    }
    
    totalMatches++;
    const hash = getDeckHash(opponentDeck);
    const battleTime = parseClashRoyaleDate(battle.battleTime);
    const isLastMatch = index === 0;
    
    const existing = deckUsage.get(hash);
    if (existing) {
      existing.count++;
      if (battleTime > existing.lastPlayed) {
        existing.lastPlayed = battleTime;
        existing.cards = opponentDeck; // Keep freshest card data
      }
      if (isLastMatch) {
        existing.isLastMatch = true;
      }
    } else {
      deckUsage.set(hash, {
        cards: opponentDeck,
        count: 1,
        lastPlayed: battleTime,
        isLastMatch,
      });
    }
  });
  
  if (deckUsage.size === 0 || totalMatches === 0) {
    return null;
  }
  
  // Find most likely deck with recency boost
  let bestDeck: DeckUsageData | null = null;
  let bestScore = 0;
  
  deckUsage.forEach((data) => {
    // Base score is count, recency boost adds 1.5x weight if it's the last match
    const score = data.count * (data.isLastMatch ? 1.5 : 1);
    if (score > bestScore) {
      bestScore = score;
      bestDeck = data;
    }
  });
  
  if (!bestDeck) {
    return null;
  }
  
  // Calculate confidence (capped at 95%, minimum 10%)
  const rawConfidence = (bestDeck.count / totalMatches) * 100;
  const confidence = Math.min(95, Math.max(10, Math.round(rawConfidence)));
  
  // Calculate average elixir and playstyle
  const avgElixir = calculateAverageElixir(bestDeck.cards);
  const playstyle = determinePlaystyle(avgElixir);
  
  // Format last played time
  const lastPlayedAgo = formatDistanceToNow(bestDeck.lastPlayed, { addSuffix: true });
  
  return {
    likelyDeck: bestDeck.cards,
    confidence,
    lastPlayedAgo,
    playstyle,
    deckHash: getDeckHash(bestDeck.cards),
    matchCount: bestDeck.count,
    totalMatches,
  };
}

async function fetchAndAnalyze(opponentTag: string): Promise<OraclePrediction | null> {
  const battles = await clashRoyaleApi.getBattleLog(opponentTag);
  
  if (!battles || battles.length === 0) {
    return null;
  }
  
  return analyzeBattleHistory(battles, opponentTag);
}

export function useOraclePrediction(opponentTag: string | null) {
  return useQuery({
    queryKey: ['oracle-prediction', opponentTag],
    queryFn: () => fetchAndAnalyze(opponentTag!),
    enabled: !!opponentTag && opponentTag.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
