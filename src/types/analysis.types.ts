/**
 * Analysis Types - Type definitions for AI analysis results
 */

// Player analysis from AI
export interface PlayerAnalysis {
  analysis: string;
  stats: {
    winRate: string;
    avgTrophyChange: string;
  };
}

// Basic deck analysis
export interface DeckAnalysis {
  synergy_score: number | null;
  meta_score: number | null;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  avg_elixir: number;
}

// Trade scenario for elixir analysis (matches ElixirAnalysisCard component)
export interface TradeScenario {
  yourCard: string;
  yourCost: number;
  enemyCard: string;
  enemyCost: number;
  tradeValue: number;
  description: string;
}

// Elixir distribution entry
export interface ElixirDistributionEntry {
  cost: number;
  count: number;
}

// Synergy pair for synergy matrix (matches SynergyMatrix component)
export interface CardSynergyPair {
  card1: string;
  card2: string;
  rating: number;
  explanation: string;
}

// Synergy matrix structure (matches SynergyMatrix component)
export interface SynergyMatrix {
  pairs: CardSynergyPair[];
  overallScore: number;
  topSynergies: string[];
  antiSynergies: string[];
}

// Matchup prediction from AI (matches MatchupPredictions component)
export interface MatchupPrediction {
  archetype: string;
  prediction: 'favorable' | 'even' | 'unfavorable';
  confidence: number;
  keyCards: string[];
  strategy: string;
}

// Advanced deck analysis
export interface AdvancedDeckAnalysis {
  elixirAnalysis: {
    avgElixir: number;
    cycleSpeed: 'fast' | 'medium' | 'slow';
    defensiveCost: number;
    offensiveCost: number;
    elixirDistribution: ElixirDistributionEntry[];
    tradeScenarios: TradeScenario[];
  };
  composition?: {
    winConditions: string[];
    defenseCards: string[];
    cycleCards: string[];
    spells: string[];
    missingRoles: string[];
    balanceNotes: string;
  };
  synergyMatrix: SynergyMatrix | null;
  matchupPredictions: MatchupPrediction[] | null;
}

// Key matchup between two cards (for prediction history)
export interface KeyMatchup {
  cardA: string;
  cardB: string;
  interaction: string;
  advantage: 'deckA' | 'deckB' | 'even';
}

// Prediction history entry for accuracy tracking
export interface PredictionHistoryEntry {
  id: string;
  deckACards: string[];
  deckBCards: string[];
  predictedWinRateA: number;
  predictedWinRateB: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string | null;
  keyMatchups: KeyMatchup[];
  tips: { forDeckA: string[]; forDeckB: string[] } | null;
  actualWinsA: number;
  actualLossesA: number;
  actualBattlesTotal: number;
  actualWinRateA: number | null;
  predictionError: number | null;
  createdAt: string;
  lastBattleAt: string | null;
}
