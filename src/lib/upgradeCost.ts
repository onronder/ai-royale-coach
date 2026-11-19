import { cardDisplayLevel } from '../../supabase/functions/_shared/card-display-level';
// Target DISPLAY level, not the rarity-relative API level. Card copies only:
// a sufficient count does not prove the player has the gold or other resources.
// Source checked 2026-11-19: https://supercell.com/en/games/clashroyale/blog/news/coming-in-the-next-update/
export const UPGRADE_COST_VERSION = 'supercell-2025-11-24';
const copies: Record<string, Record<number, number>> = {
  common: {2:2,3:4,4:10,5:20,6:50,7:100,8:200,9:400,10:800,11:1000,12:1500,13:2500,14:3500,15:5500,16:7500},
  rare: {4:2,5:4,6:10,7:20,8:50,9:100,10:200,11:300,12:400,13:550,14:750,15:1000,16:1400},
  epic: {7:2,8:4,9:10,10:20,11:30,12:50,13:70,14:100,15:130,16:180},
  legendary: {10:2,11:4,12:6,13:9,14:12,15:14,16:20},
  champion: {12:2,13:5,14:8,15:11,16:15},
};
export function nextUpgradeCopies(card: { card_level: number; max_level: number; rarity: string }): number | null {
  const level = cardDisplayLevel({ level: card.card_level, maxLevel: card.max_level });
  return level === null || level >= 16 ? null : copies[card.rarity?.toLowerCase()]?.[level + 1] ?? null;
}
