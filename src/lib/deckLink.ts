export function deckLink(cards: ReadonlyArray<{ id: number }>, language: string) {
  const ids = cards.map(card => card.id);
  if (ids.length !== 8 || new Set(ids).size !== 8 || !ids.every(id => Number.isSafeInteger(id) && id > 0)) {
    return null;
  }

  return `https://link.clashroyale.com/${language}/?clashroyale://copyDeck?deck=${ids.join(';')};`;
}
