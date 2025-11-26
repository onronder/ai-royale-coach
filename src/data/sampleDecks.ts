export interface DeckCard {
  name: string;
  emoji: string;
  elixir: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Champion';
  role: string;
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
  playstyle: string;
  strengths: string[];
  weaknesses: string[];
}

export const sampleDecks: SampleDeck[] = [
  {
    id: "hog-cycle",
    name: "Hog 2.6 Cycle",
    cards: [
      { name: "Hog Rider", emoji: "🐗", elixir: 4, rarity: "Rare", role: "Win Condition" },
      { name: "Musketeer", emoji: "🔫", elixir: 4, rarity: "Rare", role: "Air Defense" },
      { name: "Ice Golem", emoji: "🧊", elixir: 2, rarity: "Rare", role: "Tank/Kite" },
      { name: "Cannon", emoji: "🎯", elixir: 3, rarity: "Common", role: "Defense" },
      { name: "Fireball", emoji: "🔥", elixir: 4, rarity: "Rare", role: "Big Spell" },
      { name: "Log", emoji: "🪵", elixir: 2, rarity: "Legendary", role: "Small Spell" },
      { name: "Skeletons", emoji: "💀", elixir: 1, rarity: "Common", role: "Cycle/Distract" },
      { name: "Ice Spirit", emoji: "❄️", elixir: 1, rarity: "Common", role: "Cycle/Stun" }
    ],
    stats: {
      winRate: 58.2,
      avgElixir: 2.6,
      synergyScore: 8.5,
      archetype: "Cycle"
    },
    aiInsight: "Your Musketeer positioning is excellent for defense. Consider using Ice Golem to kite enemy troops while your Hog connects for extra damage. Fireball value can be improved by waiting for medium-sized pushes.",
    color: "primary",
    playstyle: "Fast-paced pressure with constant cycling",
    strengths: ["Fast cycle", "Versatile defense", "Chip damage"],
    weaknesses: ["Low HP troops", "Spell vulnerable", "Requires skill"]
  },
  {
    id: "golem-beatdown",
    name: "Golem Beatdown",
    cards: [
      { name: "Golem", emoji: "🗿", elixir: 8, rarity: "Epic", role: "Tank" },
      { name: "Night Witch", emoji: "🧙‍♀️", elixir: 4, rarity: "Legendary", role: "Support" },
      { name: "Baby Dragon", emoji: "🐉", elixir: 4, rarity: "Epic", role: "Splash/Air" },
      { name: "Lightning", emoji: "⚡", elixir: 6, rarity: "Epic", role: "Big Spell" },
      { name: "Tornado", emoji: "🌪️", elixir: 3, rarity: "Epic", role: "Control" },
      { name: "Lumberjack", emoji: "🪓", elixir: 4, rarity: "Legendary", role: "Mini Tank" },
      { name: "Mega Minion", emoji: "👾", elixir: 3, rarity: "Rare", role: "Air Defense" },
      { name: "Barbarian Barrel", emoji: "🛢️", elixir: 2, rarity: "Epic", role: "Small Spell" }
    ],
    stats: {
      winRate: 62.4,
      avgElixir: 4.6,
      synergyScore: 9.2,
      archetype: "Beatdown"
    },
    aiInsight: "Strong beatdown execution! Focus on building massive pushes in double elixir. Your Lightning timing against Inferno Tower is crucial. Consider baiting out defensive buildings before committing your Golem in single elixir.",
    color: "accent",
    playstyle: "Heavy pushes with overwhelming force",
    strengths: ["High damage", "Tower destruction", "Death damage synergy"],
    weaknesses: ["Expensive", "Slow cycle", "Vulnerable to pressure"]
  },
  {
    id: "log-bait",
    name: "Classic Log Bait",
    cards: [
      { name: "Goblin Barrel", emoji: "🛢️", elixir: 3, rarity: "Epic", role: "Win Condition" },
      { name: "Princess", emoji: "👸", elixir: 3, rarity: "Legendary", role: "Bait/Chip" },
      { name: "Knight", emoji: "🛡️", elixir: 3, rarity: "Common", role: "Mini Tank" },
      { name: "Rocket", emoji: "🚀", elixir: 6, rarity: "Rare", role: "Big Spell" },
      { name: "Goblin Gang", emoji: "👹", elixir: 3, rarity: "Common", role: "Bait/Swarm" },
      { name: "Inferno Tower", emoji: "🔥", elixir: 5, rarity: "Rare", role: "Defense" },
      { name: "Ice Spirit", emoji: "❄️", elixir: 1, rarity: "Common", role: "Cycle/Stun" },
      { name: "Log", emoji: "🪵", elixir: 2, rarity: "Legendary", role: "Small Spell" }
    ],
    stats: {
      winRate: 55.8,
      avgElixir: 3.1,
      synergyScore: 8.8,
      archetype: "Control"
    },
    aiInsight: "Excellent spell baiting! Your Princess placements force Log usage effectively. Focus on Rocket cycling in overtime when ahead. Time your Goblin Barrel predictions better against opponents who telegraph their spell usage patterns.",
    color: "success",
    playstyle: "Reactive play with spell baiting tactics",
    strengths: ["Forces bad trades", "Strong defense", "Prediction plays"],
    weaknesses: ["Spell timing crucial", "Passive early game", "Princess reliant"]
  },
  {
    id: "xbow-siege",
    name: "X-Bow 3.0 Siege",
    cards: [
      { name: "X-Bow", emoji: "🏹", elixir: 6, rarity: "Epic", role: "Win Condition" },
      { name: "Tesla", emoji: "⚡", elixir: 4, rarity: "Common", role: "Defense" },
      { name: "Archers", emoji: "🏹", elixir: 3, rarity: "Common", role: "Support/Air" },
      { name: "Ice Golem", emoji: "🧊", elixir: 2, rarity: "Rare", role: "Tank/Kite" },
      { name: "Fireball", emoji: "🔥", elixir: 4, rarity: "Rare", role: "Big Spell" },
      { name: "Log", emoji: "🪵", elixir: 2, rarity: "Legendary", role: "Small Spell" },
      { name: "Skeletons", emoji: "💀", elixir: 1, rarity: "Common", role: "Cycle/Distract" },
      { name: "Ice Spirit", emoji: "❄️", elixir: 1, rarity: "Common", role: "Cycle/Stun" }
    ],
    stats: {
      winRate: 51.3,
      avgElixir: 3.0,
      synergyScore: 7.9,
      archetype: "Siege"
    },
    aiInsight: "Patient X-Bow placements show discipline. Your defensive Tesla timing needs refinement—place it 1 tile away from the river to pull tanks. In bad matchups, focus on defensive X-Bow and Fireball chip damage rather than forcing connections.",
    color: "warning",
    playstyle: "Defensive X-Bow locks with chip damage",
    strengths: ["Range advantage", "Strong defense", "Forces reactions"],
    weaknesses: ["Matchup dependent", "High skill cap", "Commitment heavy"]
  }
];
