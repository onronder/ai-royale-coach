import { observeBattles, fixedElixir } from '../../supabase/functions/_shared/battle-observation';
import type { ClashRoyaleCard, ClashRoyaleBattle } from '../services/clashRoyaleApi';

export interface OraclePrediction {
  likelyDeck: ClashRoyaleCard[];
  confidence: number;
  lastPlayedAt: string;
  playstyle: 'Light' | 'Heavy' | 'Unknown';
  deckHash: string;
  matchCount: number;
  totalMatches: number;
}

export function analyzeBattleHistory(battles: ClashRoyaleBattle[], opponentTag: string): OraclePrediction | null {
  const sample = observeBattles(battles, opponentTag);
  const groups = new Map<string, {cards: ClashRoyaleCard[]; count: number; time: string}>();
  for (const b of sample.battles) {
    const key = `${b.mode}:${b.deck}`;
    const old = groups.get(key);
    groups.set(key, { cards: b.player.cards as unknown as ClashRoyaleCard[], count: (old?.count || 0) + 1, time: old && old.time > b.time ? old.time : b.time });
  }
  const best = [...groups.entries()].sort((a,b) => b[1].count-a[1].count || b[1].time.localeCompare(a[1].time))[0];
  if (!best) return null;
  const [deckHash, value] = best;
  const elixir = fixedElixir(value.cards);
  return { likelyDeck: value.cards, confidence: Math.round(value.count / sample.total * 100),
    lastPlayedAt: value.time, playstyle: elixir === null ? 'Unknown' : elixir <= 3.3 ? 'Light' : 'Heavy',
    deckHash, matchCount: value.count, totalMatches: sample.total };
}
