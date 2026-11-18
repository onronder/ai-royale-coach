// Synthetic game payloads only; no live player data.
export const observedAt = '2026-11-18T12:00:00.000Z';
export const clock = new Date(observedAt);
export const historyCards = () => Array.from({ length: 8 }, (_, i) => ({
  id: 26000000 + i, name: 'Fixture ' + i, level: 10, maxLevel: 14, elixirCost: 3,
}));
export const historyBattle = (time = '20261118T110000.000Z', tag = '#P0LY') => ({
  battleTime: time, type: 'PvP', deckSelection: 'collection', gameMode: { id: 72000006, name: 'Ladder' },
  team: [{ tag, name: 'Private name must not be stored', cards: historyCards(), crowns: 1, trophyChange: -30 }],
  opponent: [{ tag: '#QQQQ', name: 'Other private name', cards: historyCards(), crowns: 2 }],
});
