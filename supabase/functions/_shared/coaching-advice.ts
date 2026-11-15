import { cardDisplayLevel } from './card-display-level.ts';

type Card = { id: number; name: string; level: number; maxLevel?: number; elixirCost?: number };
type Language = 'en' | 'tr' | 'fr' | 'es' | 'pt';

export function coachingCard(card: Card) {
  return { id: card.id, name: card.name, displayLevel: cardDisplayLevel(card), elixirCost: card.elixirCost };
}

// The outgoing card belongs to the original deck, including after an alternative is chosen.
export function coachingSwap<T extends Card>(source: T[], proposed: T[], removeId: number) {
  const removed = source.find(card => card.id === removeId);
  const additions = proposed.filter(card => !source.some(original => original.id === card.id));
  if (!removed || additions.length !== 1) return null;
  return { removed, added: additions[0] };
}

export function swapStatement(removed: Card, added: Card, language: string) {
  const from = cardDisplayLevel(removed), to = cardDisplayLevel(added);
  switch (language.split('-')[0]) {
    case 'tr': return `${removed.name} (seviye ${from}) yerine ${added.name} (seviye ${to}) kullan.`;
    case 'es': return `Sustituye ${removed.name} (nivel ${from}) por ${added.name} (nivel ${to}).`;
    case 'fr': return `Remplace ${removed.name} (niveau ${from}) par ${added.name} (niveau ${to}).`;
    case 'pt': return `Troque ${removed.name} (nível ${from}) por ${added.name} (nível ${to}).`;
    default: return `Replace ${removed.name} (level ${from}) with ${added.name} (level ${to}).`;
  }
}

// Tactics may refer to the verified incoming card using {card}. Identity and level
// claims belong to the factual statement, not to model-authored or legacy prose.
export function tacticalText(value: string | null, added: Card, collection: Card[]) {
  if (!value?.trim()) return '';
  const prose = value.split('{card}').join('');
  if (/[{}\d]|\b(?:levels?|niveau[x]?|nivel(?:es)?|níve(?:l|is)|seviye\w*)/iu.test(prose)) return '';
  const words = prose.toLowerCase();
  if (collection.some(card => words.includes(card.name.toLowerCase()))) return '';
  return value.trim().split('{card}').join(added.name);
}

const practice: Record<Language, string> = {
  tr: 'Kartı kullanmadan önce rakibin karşılığını ve kalan iksirini kontrol et.',
  en: 'Before playing the card, check the opposing response and your remaining elixir.',
  es: 'Antes de jugar la carta, comprueba la respuesta del rival y el elixir que te queda.',
  fr: 'Avant de jouer la carte, vérifie la réponse adverse et ton élixir restant.',
  pt: 'Antes de jogar a carta, confira a resposta do adversário e seu elixir restante.',
};

export function formatCoachingAdvice(removed: Card, added: Card, collection: Card[], language: Language,
  reason: string | null, tip: string | null, answer?: string) {
  const facts = swapStatement(removed, added, language);
  const withFacts = (value: string | null) => [facts, tacticalText(value, added, collection)].filter(Boolean).join(' ');
  return {
    reason: withFacts(reason),
    practice: tacticalText(tip, added, collection) || practice[language],
    answer: answer === undefined ? undefined : withFacts(answer),
  };
}
