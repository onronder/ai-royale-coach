/**
 * Clash Royale Card Level Calculator
 * 
 * This utility converts API levels to in-game display levels using the universal formula.
 * 
 * === UNIVERSAL FORMULA ===
 * displayLevel = API_level + (16 - API_maxLevel)
 * 
 * This formula applies to ALL card rarities. The offset (16 - maxLevel) normalizes
 * all cards to the unified 1-16 display scale.
 * 
 * === API MAX LEVELS BY RARITY ===
 * | Rarity    | API maxLevel | Offset (16-max) | Display Range |
 * |-----------|--------------|-----------------|---------------|
 * | Common    | 16           | 0               | 1-16          |
 * | Rare      | 14           | +2              | 3-16          |
 * | Epic      | 11           | +5              | 6-16          |
 * | Legendary | 8            | +8              | 9-16          |
 * | Champion  | 6            | +10             | 11-16         |
 * 
 * === EXAMPLES ===
 * | Card Type   | API Level | Max Level | Display Level | Calculation      |
 * |-------------|-----------|-----------|---------------|------------------|
 * | Common      | 13        | 16        | 13            | 13 + (16-16) = 13|
 * | Common      | 16        | 16        | 16            | 16 + (16-16) = 16|
 * | Rare        | 7         | 14        | 9             | 7 + (16-14) = 9  |
 * | Rare        | 14        | 14        | 16            | 14 + (16-14) = 16|
 * | Epic        | 6         | 11        | 11            | 6 + (16-11) = 11 |
 * | Legendary   | 4         | 8         | 12            | 4 + (16-8) = 12  |
 * | Legendary   | 8         | 8         | 16            | 8 + (16-8) = 16  |
 * | Champion    | 1         | 6         | 11            | 1 + (16-6) = 11  |
 * | Champion    | 5         | 6         | 15            | 5 + (16-6) = 15  |
 * | Champion    | 6         | 6         | 16            | 6 + (16-6) = 16  |
 * 
 * === EVOLUTION NOTE ===
 * Card evolutions do NOT affect the display level number. An evolved card shows
 * the same level as a non-evolved card. Evolution status should be displayed
 * as a visual indicator (icon/badge) only, not added to the level number.
 * The evolutionLevel field indicates if evolution is unlocked (1) or not (0).
 */

export interface CardLevelInput {
  level: number;
  maxLevel?: number;
  evolutionLevel?: number;
  rarity?: string;
}

export interface CardLevelResult {
  displayLevel: number;
  isEvolved: boolean;
  isMaxLevel: boolean;
  isChampion: boolean;
}

/**
 * The universal max display level in Clash Royale (after Level 16 update)
 */
export const GAME_MAX_DISPLAY_LEVEL = 16;

/**
 * Champion cards have maxLevel = 6 in the API
 */
const CHAMPION_MAX_LEVEL = 6;

/**
 * Calculate the in-game display level from API card data
 * Uses the universal formula: displayLevel = level + (16 - maxLevel)
 */
export function calculateDisplayLevel(card: CardLevelInput): CardLevelResult {
  const { level, evolutionLevel, maxLevel } = card;
  
  // Universal formula: level + (16 - maxLevel)
  // If maxLevel not provided, assume Common (maxLevel = 16, offset = 0)
  const offset = maxLevel ? (GAME_MAX_DISPLAY_LEVEL - maxLevel) : 0;
  const displayLevel = level + offset;
  
  // Check if this is a champion (maxLevel = 6 in API)
  const isChampion = maxLevel === CHAMPION_MAX_LEVEL;
  
  // Check if card has evolution unlocked (visual indicator only)
  const isEvolved = (evolutionLevel ?? 0) > 0;
  
  // Check if at max display level (16)
  const isMaxLevel = displayLevel >= GAME_MAX_DISPLAY_LEVEL;
  
  return {
    displayLevel,
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
 * Format display level for UI
 */
export function formatDisplayLevel(card: CardLevelInput): string {
  const { displayLevel } = calculateDisplayLevel(card);
  return displayLevel.toString();
}

/**
 * Get level progress percentage toward max (16)
 */
export function getLevelProgress(card: CardLevelInput): number {
  const { displayLevel } = calculateDisplayLevel(card);
  return Math.min((displayLevel / GAME_MAX_DISPLAY_LEVEL) * 100, 100);
}
