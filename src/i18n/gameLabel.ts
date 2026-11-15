import type { TFunction } from 'i18next';

export function gameLabel(name: string, t: TFunction) {
  switch (name) {
    case 'Ladder': return t('gameLabels.trophyRoad');
    case 'Legendary Arena': return t('gameLabels.legendaryArena');
    default: return name;
  }
}
