export interface DeckCard {
  name: string;
  emoji: string;
}

export interface DeckStats {
  winRate: number;
  avgElixir: number;
  synergyScore: number;
  archetype: string;
}

export interface SampleDeck {
  id: string;
  name: string;
  cards: DeckCard[];
  stats: DeckStats;
  aiInsight: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
}

export const sampleDecks: SampleDeck[] = [
  {
    id: "hog-cycle",
    name: "Hog 2.6 Cycle",
    cards: [
      { name: "Hog Rider", emoji: "🐗" },
      { name: "Musketeer", emoji: "🔫" },
      { name: "Ice Golem", emoji: "🧊" },
      { name: "Cannon", emoji: "🎯" },
      { name: "Fireball", emoji: "🔥" },
      { name: "Log", emoji: "🪵" },
      { name: "Skeletons", emoji: "💀" },
      { name: "Ice Spirit", emoji: "❄️" }
    ],
    stats: {
      winRate: 58.2,
      avgElixir: 2.6,
      synergyScore: 8.5,
      archetype: "Cycle"
    },
    aiInsight: "Your Musketeer positioning is excellent for defense. Consider using Ice Golem to kite enemy troops while your Hog connects for extra damage. Fireball value can be improved by waiting for medium-sized pushes.",
    color: "primary"
  },
  {
    id: "golem-beatdown",
    name: "Golem Beatdown",
    cards: [
      { name: "Golem", emoji: "🗿" },
      { name: "Night Witch", emoji: "🧙‍♀️" },
      { name: "Baby Dragon", emoji: "🐉" },
      { name: "Lightning", emoji: "⚡" },
      { name: "Tornado", emoji: "🌪️" },
      { name: "Lumberjack", emoji: "🪓" },
      { name: "Mega Minion", emoji: "👾" },
      { name: "Barbarian Barrel", emoji: "🛢️" }
    ],
    stats: {
      winRate: 62.4,
      avgElixir: 4.6,
      synergyScore: 9.2,
      archetype: "Beatdown"
    },
    aiInsight: "Strong beatdown execution! Focus on building massive pushes in double elixir. Your Lightning timing against Inferno Tower is crucial. Consider baiting out defensive buildings before committing your Golem in single elixir.",
    color: "accent"
  },
  {
    id: "log-bait",
    name: "Classic Log Bait",
    cards: [
      { name: "Goblin Barrel", emoji: "🛢️" },
      { name: "Princess", emoji: "👸" },
      { name: "Knight", emoji: "🛡️" },
      { name: "Rocket", emoji: "🚀" },
      { name: "Goblin Gang", emoji: "👹" },
      { name: "Inferno Tower", emoji: "🔥" },
      { name: "Ice Spirit", emoji: "❄️" },
      { name: "Log", emoji: "🪵" }
    ],
    stats: {
      winRate: 55.8,
      avgElixir: 3.1,
      synergyScore: 8.8,
      archetype: "Control"
    },
    aiInsight: "Excellent spell baiting! Your Princess placements force Log usage effectively. Focus on Rocket cycling in overtime when ahead. Time your Goblin Barrel predictions better against opponents who telegraph their spell usage patterns.",
    color: "success"
  },
  {
    id: "xbow-siege",
    name: "X-Bow 3.0 Siege",
    cards: [
      { name: "X-Bow", emoji: "🏹" },
      { name: "Tesla", emoji: "⚡" },
      { name: "Archers", emoji: "🏹" },
      { name: "Ice Golem", emoji: "🧊" },
      { name: "Fireball", emoji: "🔥" },
      { name: "Log", emoji: "🪵" },
      { name: "Skeletons", emoji: "💀" },
      { name: "Ice Spirit", emoji: "❄️" }
    ],
    stats: {
      winRate: 51.3,
      avgElixir: 3.0,
      synergyScore: 7.9,
      archetype: "Siege"
    },
    aiInsight: "Patient X-Bow placements show discipline. Your defensive Tesla timing needs refinement—place it 1 tile away from the river to pull tanks. In bad matchups, focus on defensive X-Bow and Fireball chip damage rather than forcing connections.",
    color: "warning"
  }
];
