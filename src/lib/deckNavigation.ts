export function dashboardDestination(search: string) {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  if (tab === 'builder') return { tab: 'deck', subtab: 'builder' };
  const allowed: Record<string, string[]> = { coach: ['overview', 'matches', 'analytics', 'leaderboard'], deck: ['current', 'builder', 'collection'], social: ['clans', 'tournaments', 'friends'] };
  const main = tab && tab in allowed ? tab : 'coach';
  const sub = params.get('subtab');
  return { tab: main, subtab: sub && allowed[main].includes(sub) ? sub : allowed[main][0] };
}
export function importedDeck<T extends { id: number; name: string }>(value: string | null, collection: T[]): T[] | null {
  if (!value || value.length > 500) return null;
  const names = value.split(',');
  if (names.length !== 8 || new Set(names).size !== 8) return null;
  const cards = names.map(name => collection.find(c => c.name === name));
  return cards.every(Boolean) && new Set(cards.map(c => c!.id)).size === 8 ? cards as T[] : null;
}
export function deckBuilderUrl(tag: string, cards: string[]) {
  return `/player/${encodeURIComponent(tag)}?${new URLSearchParams({ tab: 'deck', subtab: 'builder', deck: cards.join(',') })}`;
}
