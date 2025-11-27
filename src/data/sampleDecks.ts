export interface DeckCard {
  name: string;
  emoji: string;
  elixir: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Champion';
  role: string;
}

export interface DeckStats {
  winRate: number; // DEMO DATA - Not real statistics
  avgElixir: number; // Real calculated value
  synergyScore: number; // DEMO DATA - Represents deck complexity (1-10 scale)
  archetype: string;
}

export interface CardSynergy {
  card1: string;
  card2: string;
  strength: number; // 0-100
  reason: string;
}

export interface MatchupData {
  opponent: string; // deck id
  winRate: number;
  difficulty: 'favored' | 'even' | 'unfavored';
  keyCards: string[];
  tacticalTips: string[];
}

export interface HistoricalData {
  patch: string;
  winRate: number; // DEMO DATA - Example historical trends
  usageRate: number; // DEMO DATA - Example historical trends
}

export interface SampleDeck {
  id: string;
  name: string;
  cards: DeckCard[];
  stats: DeckStats;
  aiInsight: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
  playstyle: string;
  playstyles: string[]; // Array of playstyle tags for filtering
  strengths: string[];
  weaknesses: string[];
  synergies: CardSynergy[];
  matchups: MatchupData[];
  history: HistoricalData[];
  difficulty: 'beginner' | 'intermediate' | 'expert';
  skillRequirements: {
    cardPlacement: number; // 1-10
    timing: number; // 1-10
    elixirManagement: number; // 1-10
    prediction: number; // 1-10
    adaptation: number; // 1-10
  };
  learningPath: {
    phase: string;
    focus: string;
    tips: string[];
  }[];
  counters: string[]; // deck ids that counter this deck
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
    weaknesses: ["Low HP troops", "Spell vulnerable", "Requires skill"],
    synergies: [
      { card1: "Hog Rider", card2: "Ice Golem", strength: 85, reason: "Ice Golem tanks and kites defenders" },
      { card1: "Musketeer", card2: "Cannon", strength: 90, reason: "Perfect defensive synergy vs tanks" },
      { card1: "Fireball", card2: "Log", strength: 75, reason: "Spell cycle for chip damage" },
      { card1: "Ice Spirit", card2: "Skeletons", strength: 95, reason: "Incredible cycle and distraction combo" },
    ],
    matchups: [
      { opponent: "golem-beatdown", winRate: 35, difficulty: "unfavored", keyCards: ["Cannon", "Musketeer"], tacticalTips: ["Never give them value for Lightning", "Pressure opposite lane aggressively", "Save Fireball for Night Witch"] },
      { opponent: "log-bait", winRate: 55, difficulty: "even", keyCards: ["Log", "Fireball"], tacticalTips: ["Log their Princess, Fireball their Goblin Gang", "Keep pressure to prevent Rocket cycling", "Predict Goblin Barrel placements"] },
      { opponent: "xbow-siege", winRate: 60, difficulty: "favored", keyCards: ["Hog Rider", "Fireball"], tacticalTips: ["Pressure same lane as X-Bow to prevent locks", "Fireball their defensive buildings", "Cycle faster than they can defend"] },
    ],
    history: [
      { patch: "Dec 2024", winRate: 58.2, usageRate: 12.5 },
      { patch: "Nov 2024", winRate: 59.1, usageRate: 13.2 },
      { patch: "Oct 2024", winRate: 57.8, usageRate: 11.8 },
      { patch: "Sep 2024", winRate: 56.5, usageRate: 10.5 },
      { patch: "Aug 2024", winRate: 55.2, usageRate: 9.8 },
    ],
    difficulty: "expert",
    skillRequirements: {
      cardPlacement: 9,
      timing: 10,
      elixirManagement: 8,
      prediction: 7,
      adaptation: 9,
    },
    learningPath: [
      {
        phase: "Foundation (Week 1-2)",
        focus: "Master basic cycling mechanics",
        tips: [
          "Learn optimal Cannon placement vs different win conditions",
          "Practice Musketeer positioning for defense",
          "Get comfortable cycling quickly with 1-elixir cards",
        ]
      },
      {
        phase: "Intermediate (Week 3-4)",
        focus: "Timing and spell value",
        tips: [
          "Learn when to commit Hog Rider vs defend",
          "Practice predicting spell placements",
          "Master Ice Golem kiting techniques",
        ]
      },
      {
        phase: "Advanced (Week 5+)",
        focus: "Perfect execution under pressure",
        tips: [
          "Develop muscle memory for frame-perfect defenses",
          "Learn all matchup-specific strategies",
          "Master elixir counting and tracking",
        ]
      }
    ],
    counters: ["golem-beatdown", "xbow-siege"],
    playstyles: ['cycle', 'aggressive', 'pressure']
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
    weaknesses: ["Expensive", "Slow cycle", "Vulnerable to pressure"],
    synergies: [
      { card1: "Golem", card2: "Night Witch", strength: 95, reason: "Death spawn synergy creates unstoppable push" },
      { card1: "Lightning", card2: "Tornado", strength: 85, reason: "Activates King Tower and clears defenses" },
      { card1: "Baby Dragon", card2: "Tornado", strength: 80, reason: "Splash damage combos with pull" },
      { card1: "Lumberjack", card2: "Golem", strength: 90, reason: "Rage on death accelerates push" },
    ],
    matchups: [
      { opponent: "hog-cycle", winRate: 65, difficulty: "favored", keyCards: ["Golem", "Lightning"], tacticalTips: ["Ignore their chip damage", "Build big pushes in double elixir", "Lightning their defensive structures"] },
      { opponent: "log-bait", winRate: 58, difficulty: "even", keyCards: ["Baby Dragon", "Barbarian Barrel"], tacticalTips: ["Baby Dragon counters their swarms", "Lightning Inferno Tower", "Push through their Rocket chip"] },
      { opponent: "xbow-siege", winRate: 70, difficulty: "favored", keyCards: ["Golem", "Lightning"], tacticalTips: ["Tank X-Bow damage with Golem", "Lightning their Tesla + Archers", "They can't stop death damage"] },
    ],
    history: [
      { patch: "Dec 2024", winRate: 62.4, usageRate: 8.3 },
      { patch: "Nov 2024", winRate: 61.8, usageRate: 7.9 },
      { patch: "Oct 2024", winRate: 63.2, usageRate: 9.1 },
      { patch: "Sep 2024", winRate: 64.1, usageRate: 10.2 },
      { patch: "Aug 2024", winRate: 62.7, usageRate: 8.8 },
    ],
    difficulty: "intermediate",
    skillRequirements: {
      cardPlacement: 6,
      timing: 7,
      elixirManagement: 9,
      prediction: 5,
      adaptation: 6,
    },
    learningPath: [
      {
        phase: "Foundation (Week 1-2)",
        focus: "Understanding beatdown fundamentals",
        tips: [
          "Learn when to start a Golem push safely",
          "Practice building support troops behind Golem",
          "Understand death damage synergies",
        ]
      },
      {
        phase: "Intermediate (Week 3-4)",
        focus: "Push optimization",
        tips: [
          "Master Lightning timing on defensive buildings",
          "Learn to use Tornado for King Tower activation",
          "Practice managing elixir disadvantage",
        ]
      },
      {
        phase: "Advanced (Week 5+)",
        focus: "Pressure adaptation",
        tips: [
          "Learn to defend opposite lane pressure",
          "Master baiting out key defensive cards",
          "Perfect your double elixir push timing",
        ]
      }
    ],
    counters: ["xbow-siege", "log-bait"],
    playstyles: ['beatdown', 'defensive', 'big-push']
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
    weaknesses: ["Spell timing crucial", "Passive early game", "Princess reliant"],
    synergies: [
      { card1: "Goblin Barrel", card2: "Princess", strength: 95, reason: "Ultimate Log bait combination" },
      { card1: "Goblin Gang", card2: "Princess", strength: 85, reason: "Forces opponent to choose what to Log" },
      { card1: "Inferno Tower", card2: "Knight", strength: 80, reason: "Knight tanks while Inferno melts" },
      { card1: "Rocket", card2: "Princess", strength: 75, reason: "Chip damage accumulation strategy" },
    ],
    matchups: [
      { opponent: "hog-cycle", winRate: 45, difficulty: "even", keyCards: ["Inferno Tower", "Knight"], tacticalTips: ["Inferno Tower counters Hog perfectly", "Bait their Log before Goblin Barrel", "Rocket cycle for overtime wins"] },
      { opponent: "golem-beatdown", winRate: 42, difficulty: "unfavored", keyCards: ["Inferno Tower", "Rocket"], tacticalTips: ["Inferno Tower is your only answer", "Rocket their support troops", "Barrel opposite lane for chip"] },
      { opponent: "xbow-siege", winRate: 52, difficulty: "even", keyCards: ["Knight", "Rocket"], tacticalTips: ["Knight tanks X-Bow shots", "Rocket their defensive setup", "Princess forces reactions"] },
    ],
    history: [
      { patch: "Dec 2024", winRate: 55.8, usageRate: 14.2 },
      { patch: "Nov 2024", winRate: 54.9, usageRate: 13.8 },
      { patch: "Oct 2024", winRate: 56.3, usageRate: 15.1 },
      { patch: "Sep 2024", winRate: 57.1, usageRate: 16.2 },
      { patch: "Aug 2024", winRate: 55.5, usageRate: 14.8 },
    ],
    difficulty: "intermediate",
    skillRequirements: {
      cardPlacement: 7,
      timing: 9,
      elixirManagement: 7,
      prediction: 10,
      adaptation: 8,
    },
    learningPath: [
      {
        phase: "Foundation (Week 1-2)",
        focus: "Spell baiting basics",
        tips: [
          "Learn Princess placement behind King Tower",
          "Practice Goblin Barrel placement variations",
          "Understand which cards bait which spells",
        ]
      },
      {
        phase: "Intermediate (Week 3-4)",
        focus: "Prediction mastery",
        tips: [
          "Learn to predict opponent's spell usage",
          "Master Rocket cycling for chip damage",
          "Practice baiting Log before Barrel",
        ]
      },
      {
        phase: "Advanced (Week 5+)",
        focus: "Mind games and adaptation",
        tips: [
          "Develop reads on opponent's patterns",
          "Learn all Goblin Barrel prediction spots",
          "Master defensive Inferno Tower placement",
        ]
      }
    ],
    counters: ["hog-cycle", "golem-beatdown"],
    playstyles: ['control', 'bait', 'chip']
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
    weaknesses: ["Matchup dependent", "High skill cap", "Commitment heavy"],
    synergies: [
      { card1: "X-Bow", card2: "Tesla", strength: 90, reason: "Tesla protects X-Bow from tanks" },
      { card1: "Ice Golem", card2: "Archers", strength: 85, reason: "Ice Golem tanks, Archers DPS" },
      { card1: "Fireball", card2: "Log", strength: 80, reason: "Spell control and chip damage" },
      { card1: "Skeletons", card2: "Ice Spirit", strength: 95, reason: "Cycle cards that distract effectively" },
    ],
    matchups: [
      { opponent: "hog-cycle", winRate: 40, difficulty: "unfavored", keyCards: ["Tesla", "Ice Golem"], tacticalTips: ["Defend with Tesla, don't commit X-Bow", "Fireball + Log for chip damage", "Out-cycle their Fireball"] },
      { opponent: "golem-beatdown", winRate: 30, difficulty: "unfavored", keyCards: ["X-Bow", "Fireball"], tacticalTips: ["Pressure opposite lane constantly", "Never let them build pushes", "Fireball their support troops"] },
      { opponent: "log-bait", winRate: 48, difficulty: "even", keyCards: ["Archers", "Fireball"], tacticalTips: ["Archers for Princess", "Log their swarms", "Fireball + Log Goblin Gang"] },
    ],
    history: [
      { patch: "Dec 2024", winRate: 51.3, usageRate: 6.8 },
      { patch: "Nov 2024", winRate: 50.8, usageRate: 6.5 },
      { patch: "Oct 2024", winRate: 52.1, usageRate: 7.2 },
      { patch: "Sep 2024", winRate: 53.5, usageRate: 8.1 },
      { patch: "Aug 2024", winRate: 51.9, usageRate: 7.4 },
    ],
    difficulty: "expert",
    skillRequirements: {
      cardPlacement: 10,
      timing: 9,
      elixirManagement: 8,
      prediction: 8,
      adaptation: 10,
    },
    learningPath: [
      {
        phase: "Foundation (Week 1-2)",
        focus: "X-Bow placement and protection",
        tips: [
          "Learn safe X-Bow placement positions",
          "Practice Tesla placement for tank pulling",
          "Understand when to go offensive vs defensive",
        ]
      },
      {
        phase: "Intermediate (Week 3-4)",
        focus: "Matchup knowledge",
        tips: [
          "Learn which matchups favor offensive X-Bow",
          "Master defensive X-Bow in bad matchups",
          "Practice spell chip damage strategies",
        ]
      },
      {
        phase: "Advanced (Week 5+)",
        focus: "Perfect execution",
        tips: [
          "Develop deep matchup understanding",
          "Master frame-perfect defensive placements",
          "Learn to adapt playstyle mid-match",
        ]
      }
    ],
    counters: ["hog-cycle", "log-bait"],
    playstyles: ['siege', 'defensive', 'control']
  }
];
