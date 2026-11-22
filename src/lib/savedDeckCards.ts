type CardIdentity = { id: number; name: string } | { card_id: number; card_name: string };

function idOf(card: CardIdentity) {
  return 'id' in card ? card.id : card.card_id;
}

export function resolveCardReference<T extends CardIdentity>(reference: unknown, catalog: readonly T[]) {
  if (reference == null || (typeof reference === 'string' && !reference.trim())) {
    return { reason: 'empty' } as const;
  }
  // Full API cards in historical records must agree on both identity fields.
  const legacy = typeof reference === 'object' && 'id' in reference && 'name' in reference ? reference : null;
  const matches = catalog.filter(card => {
    const id = idOf(card);
    const name = 'name' in card ? card.name : card.card_name;
    return legacy ? legacy.id === id && legacy.name === name : reference === id || reference === name;
  });
  if (matches.length > 1) return { reason: 'ambiguous' } as const;
  if (!matches.length || !Number.isSafeInteger(idOf(matches[0])) || idOf(matches[0]) <= 0) {
    return { reason: 'unrecognized' } as const;
  }
  return { card: matches[0] } as const;
}

function referenceLabel(reference: unknown): string | number | null {
  if (typeof reference === 'number' || typeof reference === 'string') return reference;
  if (reference && typeof reference === 'object') {
    if ('name' in reference && typeof reference.name === 'string' && reference.name.trim()) return reference.name;
    if ('id' in reference && typeof reference.id === 'number') return reference.id;
  }
  return null;
}

type SlotIssue = { slot: number; error: 'unresolved_card' | 'duplicate_card'; reference: string | number | null };

export function resolveDeckCards<T extends CardIdentity>(references: readonly unknown[], catalog: readonly T[]) {
  const cards = new Map<number, T>();
  const issues: SlotIssue[] = [];
  for (const [slot, reference] of references.entries()) {
    const match = resolveCardReference(reference, catalog);
    if (!match.card || cards.has(idOf(match.card))) {
      issues.push({ slot, error: match.card ? 'duplicate_card' : 'unresolved_card', reference: referenceLabel(reference) });
    } else {
      cards.set(idOf(match.card), match.card);
    }
  }
  return { cards, issues };
}
