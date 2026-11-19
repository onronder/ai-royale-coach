// Result-level logs cannot establish actions or event order. Reject obvious replay
// claims even when the model ignores the prompt; retain only bounded prose fields.
export function resultOnlyAdvice(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2000) return '';
  if (/\d\s*(?:s\b|sec|second|saniye|segundo|minute|minuto|dakika)|\b\d{1,2}:\d{2}\b|\b(?:early.game|mid.game|late.game|overtime|replay|placed|misplaced|deployed|you played|you used|you spent|you wasted|you lost because|yerleştirdin|oynadın|harcadın|kullandın|desplegaste|colocaste|jugaste|gastaste|vous avez placé|vous avez joué|tu as joué|tu as placé|você colocou|você jogou|você gastou)\b/iu.test(value)) return '';
  return value.trim();
}

// This field is an observed fact, never model-authored narrative. All remaining
// prose is a possible matchup/practice suggestion and is labelled as such in UI.
export function observedMatchResult(own: number, other: number, language: string): string {
  const labels: Record<string, string[]> = {
    en: ['Victory', 'Defeat', 'Draw'], tr: ['Galibiyet', 'Mağlubiyet', 'Beraberlik'],
    es: ['Victoria', 'Derrota', 'Empate'], fr: ['Victoire', 'Défaite', 'Égalité'],
    pt: ['Vitória', 'Derrota', 'Empate'],
  };
  return `${(labels[language] ?? labels.en)[own > other ? 0 : own < other ? 1 : 2]}: ${own}–${other}`;
}

export function safeMatchAdvice(value: unknown, own: string[], opponents: string[], collection: string[]) {
  const p = value as Record<string, any> | null;
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Invalid analysis response');
  const interactions = Array.isArray(p.pivotalInteractions) ? p.pivotalInteractions : [];
  const counter = p.counterDeck;
  const validCounter = counter && Array.isArray(counter.cards) && counter.cards.length === 8 &&
    new Set(counter.cards).size === 8 && counter.cards.every((name: unknown) => typeof name === 'string' && collection.includes(name));
  return {
    deckMatchup: resultOnlyAdvice(p.deckMatchup),
    recommendations: Array.isArray(p.recommendations) ? p.recommendations.map(resultOnlyAdvice).filter(Boolean).slice(0, 5) : [],
    pivotalInteractions: interactions.flatMap((i: any) => {
      if (!i || !own.includes(i.yourCard) || !opponents.includes(i.opponentCard)) return [];
      const description = resultOnlyAdvice(i.description);
      return description ? [{ yourCard: i.yourCard, opponentCard: i.opponentCard, description, evidence: 'hypothesis', impact: i.impact === 'high' ? 'high' : 'medium' }] : [];
    }).slice(0, 4),
    counterDeck: validCounter ? {
      cards: counter.cards,
      explanations: Object.fromEntries(counter.cards.map((name: string) => [name, resultOnlyAdvice(counter.explanations?.[name])])),
      overallStrategy: resultOnlyAdvice(counter.overallStrategy),
    } : null,
  };
}
