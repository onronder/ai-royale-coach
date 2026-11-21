import type { CardCollectionRow } from '../types/dashboard.types';
import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
import { cardDisplayLevel, GAME_MAX_DISPLAY_LEVEL } from '../../supabase/functions/_shared/card-display-level';
import { upgradeStep, UPGRADE_COST_VERSION } from './upgradeCost';

type CollectionCard = Pick<CardCollectionRow,
  'user_id' | 'player_tag' | 'updated_at' | 'card_id' | 'card_name' | 'rarity' | 'card_level' | 'max_level' | 'card_count'>;

interface CollectionSnapshot {
  userId: string;
  playerTag: string;
  // From get_my_card_collection_sync. Keep the last completed snapshot on refresh failure.
  sync: {
    user_id: string;
    player_tag: string;
    status: string;
    started_at: string;
    last_successful_at: string | null;
  } | null;
  cards: readonly CollectionCard[];
}

interface DeckGoal {
  // Base IDs from the current deck or unfiltered names from a saved deck.
  cards: readonly (number | string)[];
  targetLevel: number;
}

// Postgres emits ISO timestamps with up to six fractional digits. Date.parse alone
// would admit old observations within the same millisecond as the new run.
function epochMicros(timestamp: string | null) {
  if (!timestamp) return NaN;
  const fraction = timestamp.match(/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? '';
  return Date.parse(timestamp) * 1000 + Number(fraction.padEnd(6, '0').slice(3));
}

function resolveGoal(goal: DeckGoal, cards: readonly CollectionCard[]) {
  if (!Number.isInteger(goal.targetLevel) || goal.targetLevel < 1 || goal.targetLevel > GAME_MAX_DISPLAY_LEVEL) {
    return { error: 'invalid_target' } as const;
  }
  if (goal.cards.length !== 8) return { error: 'invalid_size' } as const;
  const resolved = new Map<number, CollectionCard>();
  for (const [slot, reference] of goal.cards.entries()) {
    const matches = cards.filter(card => typeof reference === 'number'
      ? card.card_id === reference : card.card_name === reference);
    if (matches.length !== 1) return { error: 'unresolved_card', slot, reference } as const;
    const card = matches[0];
    if (resolved.has(card.card_id)) return { error: 'duplicate_card', slot, reference } as const;
    resolved.set(card.card_id, card);
  }
  return { cards: resolved } as const;
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
    sharedNextUpgrade: level !== null && level < Math.min(mainTarget, secondTarget),
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
  const { sync } = snapshot;
  if (!sync || sync.status !== 'completed' || sync.user_id !== snapshot.userId || canonicalTag(sync.player_tag) !== tag) {
    return { status: 'unavailable' } as const;
  }
  const start = epochMicros(sync.started_at);
  const end = epochMicros(sync.last_successful_at);
  if (!(start <= end)) return { status: 'unavailable' } as const;
  // On update the database trigger writes transaction time; inserts use the finish timestamp.
  const cards = snapshot.cards.filter(card => {
    const observed = epochMicros(card.updated_at);
    return card.user_id === snapshot.userId && canonicalTag(card.player_tag) === tag && start <= observed && observed <= end;
  });
  const primary = resolveGoal(main, cards);
  if ('error' in primary) return { status: 'invalid', deck: 'main', ...primary } as const;
  const secondary = second && resolveGoal(second, cards);
  if (secondary && 'error' in secondary) return { status: 'invalid', deck: 'second', ...secondary } as const;

  const union = new Map([...primary.cards, ...(secondary?.cards ?? [])]);
  const rows = Array.from(union.values(), card => planCard(card,
    primary.cards.has(card.card_id) ? main.targetLevel : 0,
    second && secondary?.cards.has(card.card_id) ? second.targetLevel : 0));
  return {
    status: 'ready', priceVersion: UPGRADE_COST_VERSION, rows,
    gold: { main: sumGold(rows, 'main'), combined: sumGold(rows, 'combined'), additional: sumGold(rows, 'additional') },
  } as const;
}
