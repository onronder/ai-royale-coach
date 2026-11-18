// Foundation only: no production caller, network client, timer, or AI invocation.
export const BATTLE_WINDOW_LIMIT = 100;
export const BATTLE_WINDOW_BYTES = 512_000;

type JsonObject = Record<string, unknown>;
type Card = { id: number; level: number | null; max_level: number | null; evolution_level: number | null; elixir_cost: number | null };
export type HistoryBattle = {
  key: string;
  battle_at: string;
  mode_id: number;
  opponent_tag: string;
  facts: {
    type: string | null;
    deck_selection: string | null;
    own_cards: Card[];
    opponent_cards: Card[];
    own_crowns: number | null;
    opponent_crowns: number | null;
    trophy_change: number | null;
  };
};
export type BattleWindow = {
  version: 1;
  received: number;
  rows: HistoryBattle[];
  rejected: Record<string, number>;
};

const object = (v: unknown): JsonObject | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as JsonObject : null;
const integer = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max ? v : null;
const shortText = (v: unknown): string | null => typeof v === 'string' && v.length <= 80 ? v : null;

export function historyPlayerTag(value: unknown): string {
  if (typeof value !== 'string') throw new Error('invalid_player_tag');
  const tag = value.trim().replace(/^#/, '').toUpperCase();
  if (!/^[0289PYLQGRJCUV]{3,20}$/.test(tag)) throw new Error('invalid_player_tag');
  return tag;
}

// Strict calendar validation: Date.parse alone silently rolls some invalid dates forward.
function battleTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${(m[7] || '').padEnd(3, '0')}Z`;
  const time = Date.parse(iso);
  return Number.isFinite(time) && new Date(time).toISOString() === iso ? iso : null;
}

function cards(value: unknown): Card[] | null {
  if (!Array.isArray(value) || value.length !== 8) return null;
  const result: Card[] = [];
  for (const item of value) {
    const c = object(item);
    const id = integer(c?.id, 1, 2147483647);
    if (!c || id === null) return null;
    result.push({ id, level: integer(c.level, 0, 100), max_level: integer(c.maxLevel, 0, 100),
      evolution_level: integer(c.evolutionLevel, 0, 100), elixir_cost: integer(c.elixirCost, 0, 100) });
  }
  if (new Set(result.map(c => c.id)).size !== 8) return null;
  return result.sort((a, b) => a.id - b.id);
}

export function prepareBattleWindow(playerTag: string, fetchedAt: string, input: unknown, now = new Date()): BattleWindow {
  const tag = historyPlayerTag(playerTag);
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(fetched) || new Date(fetched).toISOString() !== fetchedAt || fetched > now.getTime() + 60_000) throw new Error('invalid_fetch_time');
  if (!Array.isArray(input) || input.length > BATTLE_WINDOW_LIMIT) throw new Error('invalid_battle_window');
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > BATTLE_WINDOW_BYTES) throw new Error('battle_window_too_large');
  const result: BattleWindow = { version: 1, received: input.length, rows: [], rejected: {} };
  const reject = (reason: string) => { result.rejected[reason] = (result.rejected[reason] || 0) + 1; };
  for (const value of input) {
    const b = object(value);
    if (!b || !Array.isArray(b.team) || !Array.isArray(b.opponent) || b.team.length !== 1 || b.opponent.length !== 1) { reject('unsupported_participants'); continue; }
    const own = object(b.team[0]), opponent = object(b.opponent[0]);
    let ownTag: string, opponentTag: string;
    try { ownTag = historyPlayerTag(own?.tag); opponentTag = historyPlayerTag(opponent?.tag); }
    catch { reject('invalid_participant'); continue; }
    if (ownTag !== tag || ownTag === opponentTag) { reject('wrong_player'); continue; }
    const at = battleTime(b.battleTime);
    if (!at || Date.parse(at) > fetched) { reject('invalid_battle_time'); continue; }
    const mode = integer(object(b.gameMode)?.id, 1, 2147483647);
    if (mode === null) { reject('missing_mode_id'); continue; }
    const ownCards = cards(own?.cards), opponentCards = cards(opponent?.cards);
    if (!ownCards || !opponentCards) { reject('invalid_deck'); continue; }
    result.rows.push({
      key: `v1|${tag}|${at}|${mode}|${opponentTag}`, battle_at: at, mode_id: mode, opponent_tag: opponentTag,
      facts: { type: shortText(b.type), deck_selection: shortText(b.deckSelection), own_cards: ownCards, opponent_cards: opponentCards,
        own_crowns: integer(own?.crowns, 0, 3), opponent_crowns: integer(opponent?.crowns, 0, 3),
        trophy_change: integer(own?.trophyChange, -32768, 32767) },
    });
  }
  // API order and deck order must not change snapshot replay detection.
  result.rows.sort((a, b) => a.key.localeCompare(b.key) || JSON.stringify(a.facts).localeCompare(JSON.stringify(b.facts)));
  return result;
}

export interface HistoryStore {
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
}

// A future authenticated producer supplies the ORIGINAL upstream fetch time, not a cache read time.
// The database gate remains authoritative even if a future caller forgets its own feature check.
export async function ingestBattleWindow(store: HistoryStore, observation: {
  userId: string; playerTag: string; fetchedAt: string; stale: boolean; battles: unknown;
}, now = new Date()): Promise<unknown> {
  if (observation.stale) return { status: 'stale_skipped' };
  const tag = historyPlayerTag(observation.playerTag);
  const window = prepareBattleWindow(tag, observation.fetchedAt, observation.battles, now);
  const { data, error } = await store.rpc('record_player_battle_window', {
    p_user: observation.userId, p_tag: tag, p_fetched_at: observation.fetchedAt, p_window: window,
  });
  if (error) throw new Error(error.message);
  return data;
}
