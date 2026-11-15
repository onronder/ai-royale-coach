import { coachingSwap, swapStatement, tacticalText } from './coaching-advice.ts';
import { containsCardName } from './card-names.ts';
import { productLanguage } from './language.ts';

type Deck = Parameters<typeof coachingSwap>[0];
export interface SavedAdvice {
  language?: string;
  source_deck: Deck;
  recommended_deck: Deck;
  recommendation: {
    remove_id: number; add_id: number; reason: string; practice: string;
    language?: string; follow_up_language?: string; verified_swap?: boolean; follow_up_verified?: boolean;
  } | null;
  follow_up_question: string | null;
  follow_up_answer: string | null;
}
export const readingFields = ['reason', 'practice', 'question', 'answer'] as const;
export type ReadingText = Record<typeof readingFields[number], string>;

// Translate tactical prose only. Rebuild the card swap and its levels from the saved decks.
export function coachingReading(task: SavedAdvice, target: string) {
  const rec = task.recommendation;
  const swap = rec && coachingSwap(task.source_deck, task.recommended_deck, rec.remove_id);
  if (!rec || !swap) return null;
  const adviceLanguage = productLanguage(rec.language ?? task.language);
  const followUpLanguage = productLanguage(rec.follow_up_language ?? task.language);
  const known = [...task.source_deck, ...task.recommended_deck];
  function prose(text: string | null, verified: boolean, source: string) {
    if (!text || !swap) return '';
    if (!verified) return containsCardName(text.split('{card}').join(''), source) ? '' : tacticalText(text, swap.added, known, source);
    const prefix = swapStatement(swap.removed, swap.added, source);
    return (text.startsWith(prefix) ? text.slice(prefix.length) : text).trim();
  }
  const verified = !!rec.verified_swap && rec.add_id === swap.added.id;
  const originals: ReadingText = {
    reason: prose(rec.reason, verified, adviceLanguage),
    practice: prose(rec.practice, verified, adviceLanguage),
    question: task.follow_up_answer ? task.follow_up_question ?? '' : '',
    answer: prose(task.follow_up_answer, !!rec.follow_up_verified && rec.add_id === swap.added.id, followUpLanguage),
  };
  const needed: Partial<ReadingText> = {};
  for (const key of readingFields) {
    const source = key === 'question' || key === 'answer' ? followUpLanguage : adviceLanguage;
    if (originals[key] && source !== target) needed[key] = originals[key];
  }
  return { originals, needed, facts: swapStatement(swap.removed, swap.added, target), adviceLanguage, followUpLanguage };
}

export function readingText(reading: NonNullable<ReturnType<typeof coachingReading>>, translated?: Partial<ReadingText>) {
  const text = { ...reading.originals };
  for (const key of readingFields) {
    if (reading.needed[key]) text[key] = translated?.[key] ?? '';
  }
  return text;
}
