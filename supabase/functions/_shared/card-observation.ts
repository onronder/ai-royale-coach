import { cardDisplayLevel } from './card-display-level.ts';
export const CARD_SOURCE_VERSION = 'supercell-observation-2026-11-19';
export type ActiveForm = 'base' | 'evolution' | 'hero' | 'unknown';
export function cardObservation(card: {id:number;level?:number;maxLevel?:number;evolutionLevel?:number;heroLevel?:number;activeForm?:ActiveForm}, slot: number | null = null) {
  return {
    baseCardId:card.id, displayLevel:cardDisplayLevel(card), slot,
    ownedForms:{evolution:typeof card.evolutionLevel==='number'?card.evolutionLevel>0:null,hero:typeof card.heroLevel==='number'?card.heroLevel>0:null},
    // Ownership is not a documented active-slot signal. Retain raw evidence separately.
    activeForm:card.activeForm ?? 'unknown',
    sourceForm:{evolutionLevel:card.evolutionLevel ?? null,heroLevel:card.heroLevel ?? null},
    sourceVersion:CARD_SOURCE_VERSION,
  };
}
