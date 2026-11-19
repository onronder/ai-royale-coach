import { observeBattles, fixedElixir, OBSERVATION_VERSION } from './battle-observation.ts';

export function recentStatistics(raw: unknown, playerTag: string) {
  const summary = observeBattles(raw, playerTag);
  const decks = new Map<string, any>();
  const cards = new Map<string, any>();
  for (const b of summary.battles) {
    const key = `${b.mode}:${b.deck}:${b.date}`;
    const deck = decks.get(key) || { deck_hash: b.deck, mode: b.mode, date: b.date,
      deck_cards: b.player.cards.map(c => c.name), battles_played: 0, battles_won: 0, battles_lost: 0,
      battles_drawn: 0, total_crowns: 0, total_trophy_change: 0, trophy_samples: 0,
      avg_elixir: fixedElixir(b.player.cards), observation_scope: OBSERVATION_VERSION };
    deck.battles_played++;
    deck[`battles_${b.outcome === 'win' ? 'won' : b.outcome === 'loss' ? 'lost' : 'drawn'}`]++;
    deck.total_crowns += b.player.crowns;
    if (b.trophyChange !== null) { deck.total_trophy_change += b.trophyChange; deck.trophy_samples++; }
    decks.set(key, deck);
    for (const c of b.player.cards) {
      const cardKey = `${b.mode}:${c.id}`;
      const card = cards.get(cardKey) || { card_id: c.id, card_name: c.name, mode: b.mode,
        times_used: 0, battles_won: 0, battles_lost: 0, battles_drawn: 0, total_crowns: 0,
        avg_elixir_decks: null, best_partner_cards: [], worst_matchup_cards: [],
        mastery_level: 0, mastery_progress: 0, observation_scope: OBSERVATION_VERSION };
      card.times_used++;
      card[`battles_${b.outcome === 'win' ? 'won' : b.outcome === 'loss' ? 'lost' : 'drawn'}`]++;
      card.total_crowns += b.player.crowns;
      cards.set(cardKey, card);
    }
  }
  return { summary, decks: [...decks.values()], cards: [...cards.values()] };
}
