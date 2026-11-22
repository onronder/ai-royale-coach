import { cardDisplayLevel } from '../../supabase/functions/_shared/card-display-level';

// Standard upgrades, by rarity and target DISPLAY level. Unlocks are excluded.
// Effective 2025-11-24, Supercell "New Card Requirements" and "New Gold Requirements":
// https://supercell.com/en/games/clashroyale/blog/news/coming-in-the-next-update/
export const UPGRADE_COST_VERSION = 'supercell-2025-11-24';
type Step = readonly [copies: number, gold: number | null];
const prices: Record<string, Record<number, Step>> = {
  common: {
    2: [2, 5], 3: [4, 20], 4: [10, 50], 5: [20, 150], 6: [50, 400], 7: [100, 1000],
    8: [200, 2000], 9: [400, 4000], 10: [800, 8000], 11: [1000, 15000],
    12: [1500, 25000], 13: [2500, 40000], 14: [3500, 60000], 15: [5500, 90000], 16: [7500, 120000],
  },
  rare: {
    4: [2, 50], 5: [4, 150], 6: [10, 400], 7: [20, 1000], 8: [50, 2000], 9: [100, 4000],
    10: [200, 8000], 11: [300, 15000], 12: [400, 25000], 13: [550, 40000],
    14: [750, 60000], 15: [1000, 90000], 16: [1400, 120000],
  },
  epic: {
    // The new table leaves the gold cell for 6 -> 7 blank.
    7: [2, null], 8: [4, 2000], 9: [10, 4000], 10: [20, 8000], 11: [30, 15000],
    12: [50, 25000], 13: [70, 40000], 14: [100, 60000], 15: [130, 90000], 16: [180, 120000],
  },
  legendary: {
    10: [2, 5000], 11: [4, 15000], 12: [6, 25000], 13: [9, 40000],
    14: [12, 60000], 15: [14, 90000], 16: [20, 120000],
  },
  champion: { 12: [2, 25000], 13: [5, 40000], 14: [8, 60000], 15: [11, 90000], 16: [15, 120000] },
};

export function upgradeStep(rarity: string, targetLevel: number): Step | null {
  return prices[rarity?.toLowerCase()]?.[targetLevel] ?? null;
}

export function nextUpgradeCopies(card: { card_level: number; max_level: number; rarity: string }): number | null {
  const level = cardDisplayLevel({ level: card.card_level, maxLevel: card.max_level });
  return level === null ? null : upgradeStep(card.rarity, level + 1)?.[0] ?? null;
}
