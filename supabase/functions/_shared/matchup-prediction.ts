export interface MatchupPredictionResult {
  deckAWinRate: number;
  deckBWinRate: number;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  keyMatchups: Array<{ deckACard: string; deckBCard: string; advantage: 'deckA' | 'deckB' | 'even'; reason: string }>;
  tips: { forDeckA: string[]; forDeckB: string[] };
  fromCache?: boolean;
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const percentage = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const texts = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);

// Shared by the handler and Oracle: missing/invalid output is never an even matchup.
export function parseMatchupPrediction(value: unknown): MatchupPredictionResult {
  if (!object(value) || !percentage(value.deckAWinRate) || !percentage(value.deckBWinRate)
    || value.deckAWinRate + value.deckBWinRate === 0
    || !['high', 'medium', 'low'].includes(value.confidence as string)
    || !text(value.explanation) || !Array.isArray(value.keyMatchups)
    || !value.keyMatchups.every(m => object(m) && text(m.deckACard) && text(m.deckBCard)
      && ['deckA', 'deckB', 'even'].includes(m.advantage as string) && text(m.reason))
    || !object(value.tips) || !texts(value.tips.forDeckA) || !texts(value.tips.forDeckB)) {
    throw new Error('Invalid matchup prediction');
  }
  const total = value.deckAWinRate + value.deckBWinRate;
  // Retain the existing normalization of valid numbers, including the endpoints 0/100.
  const a = total === 100 ? value.deckAWinRate : Math.round(value.deckAWinRate / total * 100);
  return {
    deckAWinRate: a,
    deckBWinRate: total === 100 ? value.deckBWinRate : 100 - a,
    confidence: value.confidence as MatchupPredictionResult['confidence'],
    explanation: value.explanation,
    keyMatchups: value.keyMatchups.slice(0, 4).map(m => ({
      deckACard: m.deckACard, deckBCard: m.deckBCard, advantage: m.advantage, reason: m.reason,
    })),
    tips: { forDeckA: value.tips.forDeckA.slice(0, 3), forDeckB: value.tips.forDeckB.slice(0, 3) },
  };
}
