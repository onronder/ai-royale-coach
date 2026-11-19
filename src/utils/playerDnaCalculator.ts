import type { ClashRoyaleBattle } from '@/services/clashRoyaleApi';
import { observeBattles } from '../../supabase/functions/_shared/battle-observation';

export interface PlayerDNA {
  // Compatibility field names; UI labels describe the actual observed measures.
  stats: { aggression: number | null; defense: number | null; versatility: number | null };
  sampleCount: number;
  archetype: string;
  similarPro: string;
  description: string;
}
export function calculatePlayerDNA(battles: ClashRoyaleBattle[], playerTag: string): PlayerDNA {
  const sample = observeBattles(battles, playerTag);
  const n = sample.total;
  return {
    stats: {
      aggression: sample.winRate === null ? null : Math.round(sample.winRate),
      defense: n ? Math.round(sample.battles.filter(b => b.opponents[0].crowns === 0).length / n * 100) : null,
      versatility: n ? Math.round(new Set(sample.battles.map(b => `${b.mode}:${b.deck}`)).size / n * 100) : null,
    },
    sampleCount: n, archetype: n ? 'Observed' : 'Unknown', similarPro: '',
    description: 'Recent API sample only; no placement, timing, intent or professional similarity is measured.',
  };
}
