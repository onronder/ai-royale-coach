/**
 * Clash Royale Card Level Calculator
 * 
 * This utility handles the conversion between API levels and in-game display levels.
 * The Clash Royale API returns raw levels, but the game displays different values
 * based on card rarity and evolution status.
 * 
 * === CARD RARITY MAX LEVELS (from API) ===
 * - Common:    maxLevel = 14
 * - Rare:      maxLevel = 14
 * - Epic:      maxLevel = 14
 * - Legendary: maxLevel = 14
 * - Champion:  maxLevel = 4
 * 
 * === DISPLAY LEVEL FORMULA ===
 * Base Formula: displayLevel = apiLevel + (14 - maxLevel)
 * 
 * This normalizes all cards to a 1-14 scale in-game:
 * - Common/Rare/Epic/Legendary: displayLevel = apiLevel + 0 = apiLevel
 * - Champion: displayLevel = apiLevel + 10 (so levels 1-4 display as 11-14)
 * 
 * === EVOLUTION BONUS ===
 * Evolved cards receive a +2 level bonus in-game display.
 * Final Formula: displayLevel = baseDisplayLevel + (isEvolved ? 2 : 0)
 * 
 * === EXAMPLES ===
 * | Card Type   | API Level | Max Level | Evolved | Display Level |
 * |-------------|-----------|-----------|---------|---------------|
 * | Common      | 14        | 14        | No      | 14            |
 * | Common      | 13        | 14        | Yes     | 15            |
 * | Legendary   | 14        | 14        | No      | 14            |
 * | Legendary   | 13        | 14        | Yes     | 15            |
 * | Champion    | 4         | 4         | No      | 14            |
 * | Champion    | 3         | 4         | No      | 13            |
 * 
 * === EVOLVED CARD MECHANICS ===
 * - Evolution can push display level above 14 (max is 16 for level 14 evolved)
 * - Not all cards have evolution variants
 * - Evolution level in API indicates if card is evolved (evolutionLevel > 0)
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
 * Default max levels by rarity (from Clash Royale game rules)
 */
export const RARITY_MAX_LEVELS: Record<string, number> = {
  common: 14,
  rare: 14,
  epic: 14,
  legendary: 14,
  champion: 4,
};

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
  const { level, evolutionLevel, rarity } = card;
  
  // Determine max level - use provided value, fallback to rarity lookup, then default to 14
  const maxLevel = card.maxLevel ?? 
    (rarity ? RARITY_MAX_LEVELS[rarity.toLowerCase()] : null) ?? 
    14;
  
  // Check if this is a champion (maxLevel = 4)
  const isChampion = maxLevel === 4;
  
  // Base formula: normalize to 1-14 scale
  // Champions (maxLevel 4) get +10 offset, others get +0
  const baseDisplayLevel = level + (GAME_MAX_DISPLAY_LEVEL - maxLevel);
  
  // Check if card is evolved
  const isEvolved = (evolutionLevel ?? 0) > 0;
  
  // Apply evolution bonus if evolved
  const evolutionBonus = isEvolved ? EVOLUTION_BONUS : 0;
  const displayLevel = baseDisplayLevel + evolutionBonus;
  
  // Check if at max level (considering evolution can push above 14)
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
