import { cardDisplayLevel } from './card-display-level.ts';

type Card = { id: number; name: string; level: number; maxLevel?: number; elixirCost?: number };
import { productLanguage, type Language } from './language.ts';
import { localizedCardName } from './card-names.ts';

export function coachingCard(card: Card) {
  return { id: card.id, name: card.name, displayLevel: cardDisplayLevel(card), elixirCost: card.elixirCost };
}

// Repeat the field names once, preserving every card and the game's displayed level.
// Null remains unknown; it must never become a zero level or elixir cost.
export function coachingCardTable(cards: Card[]) {
  return { columns: ['id', 'name', 'displayLevel', 'elixirCost'], rows: cards.map(card => {
    const value = coachingCard(card);
    return [value.id, value.name, value.displayLevel, value.elixirCost ?? null];
  }) };
}

// The outgoing card belongs to the original deck, including after an alternative is chosen.
export function coachingSwap<T extends Card>(source: T[], proposed: T[], removeId: number) {
  const removed = source.find(card => card.id === removeId);
  const additions = proposed.filter(card => !source.some(original => original.id === card.id));
  if (!removed || additions.length !== 1) return null;
  return { removed, added: additions[0] };
}

export function swapStatement(removed: Card, added: Card, language: string) {
  const from = cardDisplayLevel(removed) ?? '—', to = cardDisplayLevel(added) ?? '—';
  const fromName = localizedCardName(removed.name, language), toName = localizedCardName(added.name, language);
  switch (productLanguage(language)) {
    case 'tr': return `${fromName} (seviye ${from}) yerine ${toName} (seviye ${to}) kullan.`;
    case 'es': return `Sustituye ${fromName} (nivel ${from}) por ${toName} (nivel ${to}).`;
    case 'fr': return `Remplacez ${fromName} (niveau ${from}) par ${toName} (niveau ${to}).`;
    case 'pt': return `Troque ${fromName} (nível ${from}) por ${toName} (nível ${to}).`;
    default: return `Replace ${fromName} (level ${from}) with ${toName} (level ${to}).`;
  }
}

// Tactics may refer to the verified incoming card using {card}. Identity and level
// claims belong to the factual statement, not to model-authored or legacy prose.
export function tacticalText(value: string | null, added: Card, collection: Card[], language = 'en') {
  if (!value?.trim()) return '';
  const prose = value.split('{card}').join('');
  if (/[{}\d]|\b(?:levels?|niveau[x]?|nivel(?:es)?|níve(?:l|is)|seviye\w*)/iu.test(prose)) return '';
  const words = prose.toLowerCase();
  if (collection.some(card => words.includes(card.name.toLowerCase()) || words.includes(localizedCardName(card.name, language).toLowerCase()))) return '';
  return value.trim().split('{card}').join(localizedCardName(added.name, language));
}

const practice: Record<Language, string> = {
  tr: 'Kartı kullanmadan önce rakibin karşılığını ve kalan iksirini kontrol et.',
  en: 'Before playing the card, check the opposing response and your remaining elixir.',
  es: 'Antes de jugar la carta, comprueba la respuesta del rival y el elixir que te queda.',
  fr: 'Avant de jouer la carte, vérifiez la réponse adverse et votre élixir restant.',
  pt: 'Antes de jogar a carta, confira a resposta do adversário e seu elixir restante.',
};

export function formatCoachingAdvice(removed: Card, added: Card, collection: Card[], language: Language,
  reason: string | null, tip: string | null, answer?: string) {
  const facts = swapStatement(removed, added, language);
  const withFacts = (value: string | null) => [facts, tacticalText(value, added, collection, language)].filter(Boolean).join(' ');
  return {
    reason: withFacts(reason),
    practice: tacticalText(tip, added, collection, language) || practice[language],
    answer: answer === undefined ? undefined : withFacts(answer),
  };
}

export function keptDeckStatement(language: string) {
  const text: Record<Language,string> = {
    en:'Keep your current deck for this practice. No card change is recommended.',
    tr:'Bu çalışma için mevcut desteni koru. Kart değişikliği önerilmiyor.',
    es:'Conserva tu mazo para esta práctica. No se recomienda cambiar cartas.',
    fr:'Gardez votre deck pour cet exercice. Aucun changement de carte n’est recommandé.',
    pt:'Mantenha seu deck neste treino. Nenhuma troca de carta é recomendada.',
  };
  return text[productLanguage(language)];
}

export function keepDeckAdvice(deck: Card[], collection: Card[], language: Language, reason: string, tip: string) {
  return { reason: tacticalText(reason, deck[0], collection, language) || keptDeckStatement(language),
    practice: tacticalText(tip, deck[0], collection, language) || practice[language] };
}
export function validCoachingChoice(source: Card[], collection: Card[], removeId: number | null, addId: number | null) {
  if (removeId === null && addId === null) return { keep: true, deck: source };
  const removed = source.find(c => c.id === removeId), added = collection.find(c => c.id === addId);
  if (!removed || !added || source.some(c => c.id === addId) || cardDisplayLevel(removed) === null || cardDisplayLevel(added) === null) return null;
  return { keep: false, removed, added, deck: source.map(c => c.id === removeId ? added : c) };
}
