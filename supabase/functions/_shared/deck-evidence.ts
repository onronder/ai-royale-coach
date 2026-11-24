import { cardDisplayLevel } from './card-display-level.ts';
export const DECK_RULE_VERSION = 'evidence-2026-11-19';
const anchors: Array<[RegExp, string[]]> = [
  [/x.?bow|ice bow/i, ['X-Bow']], [/mortar/i, ['Mortar']], [/hog/i, ['Hog Rider']],
  [/lava/i, ['Lava Hound']], [/golem/i, ['Golem']], [/electro giant|e-giant/i, ['Electro Giant']],
  [/royal giant/i, ['Royal Giant']], [/giant/i, ['Giant']], [/graveyard|splashyard/i, ['Graveyard']],
  [/log bait|goblin barrel/i, ['Goblin Barrel']], [/miner/i, ['Miner']], [/ram rider/i, ['Ram Rider']],
  [/pekka.*bridge/i, ['P.E.K.K.A', 'Battle Ram']], [/three musketeers/i, ['Three Musketeers']],
];
export function classifyDeck<T extends { name: string; key_cards: string[] }>(names: string[], candidates: T[]): T | null {
  const owned = new Set(names.map(n => n.toLowerCase()));
  const valid = candidates.flatMap(c => {
    const required = anchors.find(([pattern]) => pattern.test(c.name))?.[1];
    // An unreviewed archetype has no evidence rule; never guess from the first DB row.
    if (!required || !required.every(n => owned.has(n.toLowerCase()))) return [];
    const matches = c.key_cards.filter(n => owned.has(n.toLowerCase())).length;
    return matches >= 2 ? [{ candidate: c, matches }] : [];
  }).sort((a, b) => b.matches - a.matches || a.candidate.name.localeCompare(b.candidate.name));
  return valid[0]?.candidate ?? null;
}

export function deckReadiness(names: string[], collection: Array<{name: string; level: number; maxLevel?: number}>, currentDeck: Array<{level: number; maxLevel?: number}>) {
  const currentLevels = currentDeck.map(cardDisplayLevel).sort((a,b) => (a ?? 0) - (b ?? 0));
  // One low-level support card must not make a much weaker deck appear equivalent.
  // This explicit median is a comparison reference, not proof of battle readiness.
  const reference = currentLevels.length === 8 && currentLevels.every(l => l !== null)
    ? (currentLevels[3]! + currentLevels[4]!) / 2 : null;
  const cards = names.map(name => {
    const card = collection.find(c => c.name === name);
    const level = card ? cardDisplayLevel(card) : null;
    return { name, owned: !!card, level, gap: reference !== null && level !== null ? Math.max(0, reference - level) : null };
  });
  return { cards, reference, state: names.length !== 8 || new Set(names).size !== 8 || cards.some(c => !c.owned) ? 'unavailable'
    : cards.some(c => c.level === null) || reference === null ? 'unknown'
    : cards.some(c => c.gap! > 0) ? 'investment' : 'ready',
    // Base-card ownership is not proof of active evolution/hero slots or mode legality.
    formsVerified: false };
}

export function evidenceKey(player: any, battles: unknown = []) {
  const card = (c: any) => [c.id, c.name ?? null, c.rarity ?? null, c.elixirCost ?? null, c.maxEvolutionLevel ?? null, c.maxHeroLevel ?? null, c.level ?? null, c.maxLevel ?? null, c.evolutionLevel ?? null, c.heroLevel ?? null, c.count ?? null, c.activeForm ?? 'unknown', c.slot ?? null];
  return JSON.stringify([DECK_RULE_VERSION, player?.tag, player?.trophies, player?.currentDeck?.map(card),
    player?.currentDeckSupportCards ?? null, player?.cards?.map(card).sort((a: any[], b: any[]) => a[0] - b[0]), battles]);
}
export async function evidenceHash(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function profileAnalysisTag(tag: unknown): string | null {
  if (typeof tag !== 'string') return null;
  const normalized = tag.replace(/^#/, '').toUpperCase();
  return /^[0289PYLQGRJCUV]{3,15}$/.test(normalized) ? normalized : null;
}
