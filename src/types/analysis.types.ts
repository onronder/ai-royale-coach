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

// Trade scenario for elixir analysis
export interface TradeScenario {
  cardIn: string;
  cardOut: string;
  elixirDifference: number;
  reason: string;
}

// Elixir distribution entry
export interface ElixirDistributionEntry {
  cost: number;
  count: number;
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

// Synergy matrix structure
export interface SynergyMatrix {
  [cardName: string]: { [otherCard: string]: number };
}

// Matchup prediction from AI
export interface MatchupPrediction {
  archetype: string;
  winProbability: number;
  tips: string[];
}

// Key matchup between two cards
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
