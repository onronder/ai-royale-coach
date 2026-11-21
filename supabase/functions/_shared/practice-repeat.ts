import { coachingReading, type SavedAdvice } from './coaching-reading.ts';
import { observeBattles, observedTime } from './battle-observation.ts';
import { coachingMatchPrefix, deckKey, firstTaskBattle, normalizeTag } from './coaching-match.ts';

type Result = { score: number[]; key?: string; battle_time?: string };
export function firstPracticeSentence(text: string) {
  const boundary = /[.!?]\s/u.exec(text);
  return boundary ? text.slice(0, boundary.index + 1) : text;
}

// Legacy keys identify the player, raw API timestamp and opponent, but omit the game mode.
export function confirmLegacyPractice(task: {
  matched_battle_key: string; battle_result: Result; shown_at: string; recommended_deck: { id: number }[];
}, tag: string, history: unknown): string | null {
  const first = task.battle_result;
  if (!Array.isArray(first.score) || first.score.length !== 2 || !Array.isArray(task.recommended_deck) ||
    task.recommended_deck.length !== 8 || !task.recommended_deck.every(c => Number.isSafeInteger(c?.id))) return null;
  const time = first.battle_time;
  if (!time || !(Date.parse(time) > Date.parse(task.shown_at)) || !Array.isArray(history)) return null;
  const atTime = history.filter(row => observedTime(row?.battleTime) === time);
  const { battles, excluded } = observeBattles(atTime, tag);
  if (excluded || battles.length !== 1) return null;
  const [b] = battles;
  if (b.format !== '1v1' || deckKey(b.player.cards) !== deckKey(task.recommended_deck) ||
    first.score[0] !== b.player.crowns || first.score[1] !== b.opponents[0].crowns) return null;
  const opponent = normalizeTag(b.opponents[0].tag);
  const exact = atTime.some(row => `${normalizeTag(tag)}:${row.battleTime}:${opponent}` === first.key);
  return exact && first.key === task.matched_battle_key ? first.key : null;
}

export function practiceGoal(
  task: SavedAdvice & { battle_result: Result | null; matched_battle_key?: string | null; reverified_legacy_key?: string },
  tag: string,
) {
  const first = task.battle_result;
  if (
    !first || typeof first.key !== 'string' || first.key !== task.matched_battle_key ||
    (!first.key.startsWith(coachingMatchPrefix(tag)) && first.key !== task.reverified_legacy_key) ||
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
