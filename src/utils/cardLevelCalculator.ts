/**
 * Clash Royale Card Level Calculator
 * 
 * This utility handles the conversion between API levels and in-game display levels.
 * 
 * === API MAX LEVELS (actual values from Clash Royale API) ===
 * - Common:    maxLevel = 16
 * - Rare:      maxLevel = 14
 * - Epic:      maxLevel = 11
 * - Legendary: maxLevel = 8
 * - Champion:  maxLevel = 6
 * 
 * === DISPLAY LEVEL RULES ===
 * 
 * For NON-CHAMPION cards (maxLevel > 6):
 *   - The API level IS the in-game display level directly
 *   - displayLevel = apiLevel + evolutionBonus
 * 
 * For CHAMPION cards (maxLevel <= 6):
 *   - Champions display on an 11-14 scale in-game
 *   - displayLevel = apiLevel + (14 - maxLevel) + evolutionBonus
 *   - Example: Level 3 champion with maxLevel 6 = 3 + 8 = 11
 * 
 * === EVOLUTION BONUS ===
 * Evolved cards receive a +2 level bonus in-game display.
 * 
 * === EXAMPLES ===
 * | Card Type   | API Level | Max Level | Evolved | Display Level |
 * |-------------|-----------|-----------|---------|---------------|
 * | Common      | 13        | 16        | No      | 13            |
 * | Common      | 13        | 16        | Yes     | 15            |
 * | Rare        | 10        | 14        | No      | 10            |
 * | Legendary   | 4         | 8         | Yes     | 6             |
 * | Champion    | 3         | 6         | No      | 11            |
 * | Champion    | 6         | 6         | No      | 14            |
 */

export interface CardLevelInput {
  level: number;
  maxLevel?: number;
  evolutionLevel?: number;
  rarity?: string;
}

export interface CardLevelResult {
  displayLevel: number;
  baseDisplayLevel: number;
  evolutionBonus: number;
  isEvolved: boolean;
  isMaxLevel: boolean;
  isChampion: boolean;
}

/**
 * Champion cards have maxLevel <= 6 in the API
 */
const CHAMPION_MAX_LEVEL_THRESHOLD = 6;

/**
 * The universal max display level in Clash Royale
 */
export const GAME_MAX_DISPLAY_LEVEL = 14;

/**
 * Evolution level bonus applied in-game
 */
export const EVOLUTION_BONUS = 2;

/**
 * Calculate the in-game display level from API card data
 */
export function calculateDisplayLevel(card: CardLevelInput): CardLevelResult {
  const { level, evolutionLevel, maxLevel } = card;
  
  // Check if this is a champion (maxLevel <= 6 in API)
  const isChampion = maxLevel !== undefined && maxLevel <= CHAMPION_MAX_LEVEL_THRESHOLD;
  
  let baseDisplayLevel: number;
  
  if (isChampion && maxLevel !== undefined) {
    // Champions: normalize to 11-14 scale
    // Level 1 champion with maxLevel 6 = 1 + 8 = 9... but champions start at 11
    // Actually: level + (14 - maxLevel) where maxLevel is 6 gives +8 offset
    baseDisplayLevel = level + (GAME_MAX_DISPLAY_LEVEL - maxLevel);
  } else {
    // Non-champions: API level IS the display level
    baseDisplayLevel = level;
  }
  
  // Check if card is evolved
  const isEvolved = (evolutionLevel ?? 0) > 0;
  
  // Apply evolution bonus if evolved
  const evolutionBonus = isEvolved ? EVOLUTION_BONUS : 0;
  const displayLevel = baseDisplayLevel + evolutionBonus;
  
  // Check if at max level (14 for non-evolved, 16 for evolved)
  const maxPossibleLevel = GAME_MAX_DISPLAY_LEVEL + (isEvolved ? EVOLUTION_BONUS : 0);
  const isMaxLevel = displayLevel >= maxPossibleLevel;
  
  return {
    displayLevel,
    baseDisplayLevel,
    evolutionBonus,
    isEvolved,
    isMaxLevel,
    isChampion,
  };
}

/**
 * Simple helper to get just the display level number
 */
export function getDisplayLevel(card: CardLevelInput): number {
  return calculateDisplayLevel(card).displayLevel;
}

/**
 * Format display level for UI (handles cases above 14)
 */
export function formatDisplayLevel(card: CardLevelInput): string {
  const { displayLevel } = calculateDisplayLevel(card);
  return displayLevel.toString();
}

/**
 * Get level progress percentage toward max (useful for progress bars)
 * Note: Evolution bonus is not counted toward max progress
 */
export function getLevelProgress(card: CardLevelInput): number {
  const { baseDisplayLevel } = calculateDisplayLevel(card);
  return Math.min((baseDisplayLevel / GAME_MAX_DISPLAY_LEVEL) * 100, 100);
}
