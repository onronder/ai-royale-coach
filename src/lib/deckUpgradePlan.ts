import type { CardCollectionRow } from '../types/dashboard.types';
import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
import { cardDisplayLevel, GAME_MAX_DISPLAY_LEVEL } from '../../supabase/functions/_shared/card-display-level';
import { resolveDeckCards } from './savedDeckCards';
import { upgradeStep, UPGRADE_COST_VERSION } from './upgradeCost';

type CollectionCard = Pick<CardCollectionRow,
  'user_id' | 'player_tag' | 'updated_at' | 'card_id' | 'card_name' | 'rarity' | 'card_level' | 'max_level' | 'card_count'>;

export interface CollectionRead {
  // Operation metadata and collection rows are fetched independently.
  sync: {
    user_id: string;
    player_tag: string;
    status: string;
    started_at: string;
    last_successful_at: string | null;
    synced_cards: number | null;
  } | null;
  cards: readonly CollectionCard[];
}

interface CollectionSnapshot extends CollectionRead {
  userId: string;
  playerTag: string;
  // Retain the last complete read together (rows and operation) while either query refreshes.
  previous?: CollectionRead;
}

interface DeckGoal {
  cards: readonly unknown[];
  targetLevel: number;
}

// Postgres emits ISO timestamps with up to six fractional digits. Date.parse alone
// would admit old observations within the same millisecond as the new run.
function epochMicros(timestamp: string | null) {
  if (!timestamp) return NaN;
  const fraction = timestamp.match(/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? '';
  return Date.parse(timestamp) * 1000 + Number(fraction.padEnd(6, '0').slice(3));
}

export function completedCollection(read: CollectionRead, userId: string, tag: string) {
  const { sync } = read;
  if (sync?.status !== 'completed' || sync.user_id !== userId || canonicalTag(sync.player_tag) !== tag ||
      !sync.last_successful_at || !Number.isInteger(sync.synced_cards) || (sync.synced_cards ?? 0) < 1) return null;
  const start = epochMicros(sync.started_at);
  const end = epochMicros(sync.last_successful_at);
  if (!(start <= end)) return null;

  // Inserts have the finish timestamp; the DB trigger stamps updates with transaction time.
  const cards: CollectionCard[] = [];
  for (const card of read.cards) {
    if (card.user_id !== userId || canonicalTag(card.player_tag) !== tag) continue;
    const observed = epochMicros(card.updated_at);
    if (observed > end) return null; // rows from a newer run arrived before its metadata
    if (observed >= start) cards.push(card);
  }
  if (cards.length !== sync.synced_cards || new Set(cards.map(card => card.card_id)).size !== cards.length) return null;
  return { cards, end, asOf: sync.last_successful_at };
}

function resolveGoal(goal: DeckGoal, cards: readonly CollectionCard[]) {
  if (!Number.isInteger(goal.targetLevel) || goal.targetLevel < 1 || goal.targetLevel > GAME_MAX_DISPLAY_LEVEL) {
    return { error: 'invalid_target' } as const;
  }
  if (goal.cards.length !== 8) return { error: 'invalid_size' } as const;
  const resolved = resolveDeckCards(goal.cards, cards);
  if (resolved.issues.length) {
    const { error, slot, reference } = resolved.issues[0];
    return { error, slot, reference };
  }
  return { cards: resolved.cards };
}

// knownGold is the priced portion; gold is exact only if every step is priced.
interface Cost {
  copies: number | null;
  knownGold: number;
  gold: number | null;
}

function addExact(a: number | null, b: number | null) {
  return a === null || b === null ? null : a + b;
}

function stepRange(rarity: string, current: number | null, afterTarget: number, target: number): Cost {
  const cost: Cost = { copies: 0, knownGold: 0, gold: 0 };
  if (target <= afterTarget) return cost;
  if (current === null) return { copies: null, knownGold: 0, gold: null };
  for (let level = Math.max(current, afterTarget) + 1; level <= target; level++) {
    const step = upgradeStep(rarity, level);
    const gold = step?.[1] ?? null;
    cost.copies = addExact(cost.copies, step?.[0] ?? null);
    cost.knownGold += gold ?? 0;
    cost.gold = addExact(cost.gold, gold);
  }
  return cost;
}

function missingCopies(required: number | null, owned: number | null) {
  if (required === 0) return 0;
  return required === null || owned === null ? null : Math.max(0, required - owned);
}

function planCard(card: CollectionCard, mainTarget: number, secondTarget: number) {
  const level = cardDisplayLevel({ level: card.card_level, maxLevel: card.max_level });
  const combinedTarget = Math.max(mainTarget, secondTarget);
  const sharedTarget = Math.min(mainTarget, secondTarget);
  const main = stepRange(card.rarity, level, 0, mainTarget);
  const extra = stepRange(card.rarity, level, mainTarget, combinedTarget);
  const combined = {
    copies: addExact(main.copies, extra.copies),
    knownGold: main.knownGold + extra.knownGold,
    gold: addExact(main.gold, extra.gold),
  };
  const mainMissing = missingCopies(main.copies, card.card_count);
  const combinedMissing = missingCopies(combined.copies, card.card_count);
  const extraMissing = extra.copies === 0 ? 0
    : combinedMissing === null || mainMissing === null ? null : combinedMissing - mainMissing;
  return {
    cardId: card.card_id, name: card.card_name, level, mainTarget: mainTarget || null, secondTarget: secondTarget || null,
    sharedNextUpgrade: sharedTarget === 0 ? false : level === null ? null : level < sharedTarget,
    main: { ...main, missingCopies: mainMissing },
    combined: { ...combined, missingCopies: combinedMissing },
    additional: { ...extra, missingCopies: extraMissing },
  };
}

type PlanRow = ReturnType<typeof planCard>;

function sumGold(rows: readonly PlanRow[], scope: 'main' | 'combined' | 'additional') {
  let total: number | null = 0;
  let known = 0;
  for (const row of rows) {
    total = addExact(total, row[scope].gold);
    known += row[scope].knownGold;
  }
  return { total, known };
}

export function calculateDeckUpgradePlan(snapshot: CollectionSnapshot, main: DeckGoal, second?: DeckGoal) {
  const tag = canonicalTag(snapshot.playerTag);
  const { userId, sync, previous } = snapshot;
  const current = completedCollection(snapshot, userId, tag);
  const saved = previous && completedCollection(previous, userId, tag);
  const collection = saved && (!current || saved.end > current.end) ? saved : current;
  const missingData = sync && (sync.status === 'failed' || sync.status === 'cancelled' ||
    sync.user_id !== userId || canonicalTag(sync.player_tag) !== tag) ? 'unavailable' : 'waiting';
  if (!collection) return { status: missingData } as const;

  // A late completed read cannot invalidate a newer verified collection. With split
  // responses, either a newer operation or a newer row can still be outstanding.
  const latestVerified = current !== null || (
    sync?.status === 'completed' && sync.user_id === userId && canonicalTag(sync.player_tag) === tag &&
    epochMicros(sync.last_successful_at) <= collection.end &&
    !snapshot.cards.some(card => card.user_id === userId && canonicalTag(card.player_tag) === tag &&
      epochMicros(card.updated_at) > collection.end)
  );
  const freshness: 'current' | 'previous' = latestVerified ? 'current' : 'previous';
  const observation = { asOf: collection.asOf, freshness, priceVersion: UPGRADE_COST_VERSION };
  const primary = resolveGoal(main, collection.cards);
  if ('error' in primary) {
    if (freshness === 'previous' && primary.error === 'unresolved_card') return { status: missingData, ...observation } as const;
    return { status: 'invalid', deck: 'main', ...primary, ...observation } as const;
  }
  const secondary = second && resolveGoal(second, collection.cards);
  if (secondary && 'error' in secondary) {
    const rows = Array.from(primary.cards.values(), card => planCard(card, main.targetLevel, 0));
    const mainPlan = { rows, gold: sumGold(rows, 'main') };
    if (freshness === 'previous' && secondary.error === 'unresolved_card') {
      return { status: missingData, mainPlan, ...observation } as const;
    }
    return { status: 'invalid', deck: 'second', ...secondary, mainPlan, ...observation } as const;
  }

  const union = new Map([...primary.cards, ...(secondary?.cards ?? [])]);
  const rows = Array.from(union.values(), card => planCard(card,
    primary.cards.has(card.card_id) ? main.targetLevel : 0,
    second && secondary?.cards.has(card.card_id) ? second.targetLevel : 0));
  return {
    status: 'ready', ...observation, rows, secondCardIds: Array.from(secondary?.cards.keys() ?? []),
    sharedNextUpgrade: rows.some(row => row.sharedNextUpgrade === true) ? true
      : rows.some(row => row.sharedNextUpgrade === null) ? null : false,
    gold: { main: sumGold(rows, 'main'), combined: sumGold(rows, 'combined'), additional: sumGold(rows, 'additional') },
  } as const;
}
