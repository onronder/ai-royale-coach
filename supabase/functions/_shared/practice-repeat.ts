import { coachingReading, type SavedAdvice } from './coaching-reading.ts';
import { firstTaskBattle } from './coaching-match.ts';

type Result = { score: number[]; key?: string; battle_time?: string };
export function firstPracticeSentence(text: string) {
  const boundary = /[.!?]\s/u.exec(text);
  return boundary ? text.slice(0, boundary.index + 1) : text;
}

export function practiceGoal(
  task: SavedAdvice & { battle_result: Result | null; matched_battle_key?: string | null },
) {
  const first = task.battle_result;
  if (
    !first || !first.key || first.key !== task.matched_battle_key ||
    !Number.isFinite(Date.parse(first.battle_time ?? '')) ||
    !Array.isArray(first.score) || first.score.length !== 2 ||
    !first.score.every((n) => Number.isInteger(n) && n >= 0 && n <= 3) ||
    !Array.isArray(task.recommended_deck) || task.recommended_deck.length !== 8 ||
    !task.recommended_deck.every((c) => Number.isSafeInteger(c?.id)) ||
    new Set(task.recommended_deck.map((c) => c.id)).size !== 8
  ) return null;
  const reading = coachingReading(task, task.recommendation?.language ?? task.language ?? 'en');
  const tip = reading?.originals.practice.trim();
  if (!reading || !tip) return null;
  return { tip: firstPracticeSentence(tip), language: reading.adviceLanguage };
}

export async function checkPracticeMatch(
  tag: string,
  repeat: { accepted_at: string; deck_ids: number[]; first: { battle_time: string } },
  fetchBattles: () => Promise<unknown>,
) {
  const battles = await fetchBattles();
  if (!Array.isArray(battles)) throw new Error('battle_feed_unavailable');
  const after = new Date(Math.max(Date.parse(repeat.accepted_at), Date.parse(repeat.first.battle_time)))
    .toISOString();
  return firstTaskBattle(tag, after, repeat.deck_ids.map((id) => ({ id })), battles);
}
