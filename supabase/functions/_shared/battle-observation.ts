import { CARD_SOURCE_VERSION } from './card-observation.ts';
// Recent API observations, not a complete lifetime history or an event replay.
export const OBSERVATION_VERSION = 'recent-battles-v2';
export type CardObservation = { id: number; name: string; level?: number; maxLevel?: number; elixirCost?: number; evolutionLevel?: number; [key: string]: unknown };
type Participant = { tag: string; crowns: number; cards: CardObservation[]; trophyChange?: number; startingTrophies?: number; [key: string]: unknown };
export type BattleObservation = {
  key: string; time: string; date: string; mode: string; format: '1v1' | '2v2';
  player: Participant; opponents: Participant[]; outcome: 'win' | 'loss' | 'draw';
  deck: string; trophyChange: number | null;
  evidence: string;
};
export const canonicalTag = (value: string) => '#' + value.trim().replace(/^#/, '').toUpperCase();

export function observedTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{3})?Z$/.exec(value);
  const iso = compact ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}${compact[7] || '.000'}Z` : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(iso)) return null;
  const time = Date.parse(iso);
  return Number.isFinite(time) && new Date(time).toISOString() === iso ? iso : null;
}

// Slots remain part of identity: the same base cards don't prove the same forms.
export function observedDeck(cards: CardObservation[], supportCards: unknown = null): string {
  const value = (c: any,slot: number) => [c?.id ?? null,slot,c?.level ?? null,c?.maxLevel ?? null,c?.evolutionLevel ?? null,c?.heroLevel ?? null,c?.activeForm ?? 'unknown'];
  return JSON.stringify([CARD_SOURCE_VERSION,cards.map(value),Array.isArray(supportCards)?supportCards.map(value):null]);
}
export function fixedElixir(cards: Array<{ id?: number; name?: string; elixirCost?: number }>): number | null {
  if (cards.length !== 8 || cards.some(c => c.id === 28000006 || c.name === 'Mirror' ||
    !Number.isFinite(c.elixirCost) || c.elixirCost! < 0 || c.elixirCost! > 10)) return null;
  return cards.reduce((sum, c) => sum + c.elixirCost!, 0) / cards.length;
}

export function observeBattle(raw: any, tag: string): BattleObservation | null {
  const time = observedTime(raw?.battleTime);
  if (!time || !Array.isArray(raw.team) || !Array.isArray(raw.opponent)) return null;
  // Duel series need an explicit game adapter; never interpret the series as one game.
  if (/duel|multideck|boatbattle/i.test(`${raw.type} ${raw.gameMode?.name}`)) return null;
  const teams = [raw.team, raw.opponent] as Participant[][];
  if (![1, 2].includes(teams[0].length) || teams[0].length !== teams[1].length) return null;
  const participants = teams.flat();
  if (participants.some(p => p && Array.isArray(p.rounds))) return null;
  if (participants.some(p => !p || typeof p.tag !== 'string' || !Number.isInteger(p.crowns) || p.crowns < 0 || p.crowns > 3 ||
    !Array.isArray(p.cards) || p.cards.length !== 8 || p.cards.some(c => !c || !Number.isSafeInteger(c.id) || typeof c.name !== 'string') ||
    new Set(p.cards.map(c => c.id)).size !== 8)) return null;
  if (new Set(participants.map(p => canonicalTag(p.tag))).size !== participants.length) return null;
  if (teams.some(side => side.some(p => p.crowns !== side[0].crowns))) return null;
  const index = teams.findIndex(side => side.some(p => canonicalTag(p.tag) === canonicalTag(tag)));
  if (index < 0) return null;
  const own = teams[index], opponents = teams[1 - index];
  const player = own.find(p => canonicalTag(p.tag) === canonicalTag(tag))!;
  const format = own.length === 1 ? '1v1' : '2v2';
  const mode = `${format}:${raw.type ?? 'unknown'}:${raw.gameMode?.name ?? raw.gameMode?.id ?? 'unknown'}`;
  const sides = teams.map(side => side.map(p => canonicalTag(p.tag)).sort().join(',')).sort();
  const evidence = JSON.stringify(participants.map(p => [canonicalTag(p.tag),p.crowns,p.trophyChange ?? null,p.startingTrophies ?? null,observedDeck(p.cards,p.supportCards)]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));
  return { key: JSON.stringify([time, mode, ...sides]), time, date: time.slice(0, 10), mode, format, player, opponents,
    outcome: player.crowns > opponents[0].crowns ? 'win' : player.crowns < opponents[0].crowns ? 'loss' : 'draw',
    deck: observedDeck(player.cards,player.supportCards ?? null), trophyChange: Number.isSafeInteger(player.trophyChange) ? player.trophyChange! : null, evidence };
}

export function observeBattles(raw: unknown, tag: string) {
  const rows = Array.isArray(raw) ? raw : [];
  const unique = new Map<string, BattleObservation>();
  const conflicts = new Set<string>();
  let excluded = 0;
  for (const row of rows) {
    const item = observeBattle(row, tag);
    if (!item) { excluded++; continue; }
    const old = unique.get(item.key);
    if (old && old.evidence !== item.evidence) conflicts.add(item.key);
    unique.set(item.key, item);
  }
  for (const key of conflicts) unique.delete(key);
  const battles = [...unique.values()].sort((a, b) => a.time.localeCompare(b.time));
  const wins = battles.filter(b => b.outcome === 'win').length;
  const losses = battles.filter(b => b.outcome === 'loss').length;
  const draws = battles.filter(b => b.outcome === 'draw').length;
  return { battles, wins, losses, draws, total: battles.length, excluded: excluded + conflicts.size,
    winRate: battles.length ? wins / battles.length * 100 : null, scope: OBSERVATION_VERSION };
}
