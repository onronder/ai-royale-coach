export const GAME_MAX_DISPLAY_LEVEL = 16;

export function cardDisplayLevel(card: { level: number; maxLevel?: number }) {
  return card.level + GAME_MAX_DISPLAY_LEVEL - (card.maxLevel || GAME_MAX_DISPLAY_LEVEL);
}
