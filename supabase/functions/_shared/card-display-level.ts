export const GAME_MAX_DISPLAY_LEVEL = 16;

export function cardDisplayLevel(card: { level?: number; maxLevel?: number }) {
  if (typeof card.level !== 'number' || !Number.isInteger(card.level) || !Number.isInteger(card.maxLevel) || card.level < 1 ||
      card.maxLevel! < 1 || card.maxLevel! > GAME_MAX_DISPLAY_LEVEL || card.level > card.maxLevel!) return null;
  return card.level + GAME_MAX_DISPLAY_LEVEL - card.maxLevel!;
}
