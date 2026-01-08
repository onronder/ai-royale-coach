import { ClashRoyaleCard } from '@/services/clashRoyaleApi';

export interface SimulationFrame {
  tick: number;
  userHp: number;
  proHp: number;
  events: string[];
  criticalAction?: 'rocket_hit' | 'tower_down' | 'defense_success' | 'emote';
}

export interface SimulationResult {
  winner: 'user' | 'pro';
  finalScore: string;
  winProbability: number;
  timeline: SimulationFrame[];
}

export interface SimulationInput {
  userDeck: ClashRoyaleCard[];
  proDeck: ClashRoyaleCard[];
  userTrophies: number;
  proTrophies: number;
  userName?: string;
  proName: string;
}

const TOWER_HP = 3056;
const MATCH_DURATION = 180; // 3 minutes in seconds
const DAMAGE_TICK_INTERVAL = 5; // Process damage every 5 seconds

// Emotes for flavor
const PRO_EMOTES = [
  'sends a Goblin laugh emote!',
  'drops a King crying emote!',
  'sends a Good Game!',
  'uses the Hog scream emote!',
  'sends a thumbs up!',
];

/**
 * Calculate win probability using Elo formula with card level adjustment
 */
function calculateWinProbability(
  userTrophies: number,
  proTrophies: number,
  userDeck: ClashRoyaleCard[]
): number {
  // Base Elo probability
  const eloProbability = 1 / (1 + Math.pow(10, (proTrophies - userTrophies) / 400));

  // Card level adjustment (assume pro is max level 14)
  const avgUserLevel = userDeck.reduce((sum, card) => sum + (card.level || 14), 0) / userDeck.length;
  const levelPenalty = (14 - avgUserLevel) * 0.02; // 2% penalty per level below max

  // Clamp between 5% and 95%
  return Math.max(0.05, Math.min(0.95, eloProbability - levelPenalty));
}

/**
 * Get a random card name from a deck (for event text)
 */
function getRandomCardName(deck: ClashRoyaleCard[]): string {
  const card = deck[Math.floor(Math.random() * deck.length)];
  return card?.name || 'card';
}

/**
 * Get a win condition card from deck (high elixir cost)
 */
function getWinCondition(deck: ClashRoyaleCard[]): string {
  const winCon = deck.find((card) => (card.elixirCost || 0) >= 4);
  return winCon?.name || 'attack';
}

/**
 * Generate a random emote event
 */
function getRandomEmote(): string {
  return PRO_EMOTES[Math.floor(Math.random() * PRO_EMOTES.length)];
}

/**
 * Calculate crowns based on HP
 */
function calculateCrowns(hp: number): number {
  if (hp <= 0) return 0;
  if (hp < TOWER_HP * 0.33) return 0;
  return 1;
}

/**
 * Simulate a dream match between user and pro player
 * Pure, synchronous function with no recursion
 */
export function simulateDreamMatch(input: SimulationInput): SimulationResult {
  const { userDeck, proDeck, userTrophies, proTrophies, userName = 'You', proName } = input;

  // Step 1: Calculate win probability
  const winProbability = calculateWinProbability(userTrophies, proTrophies, userDeck);

  // Step 2: Initialize match state
  let userHp = TOWER_HP;
  let proHp = TOWER_HP;
  const timeline: SimulationFrame[] = [];

  let userTowerDestroyed = false;
  let proTowerDestroyed = false;

  // Step 3: Simulation loop (180 ticks, NO recursion)
  for (let tick = 0; tick <= MATCH_DURATION; tick++) {
    const events: string[] = [];
    let criticalAction: SimulationFrame['criticalAction'] | undefined;

    // Match already decided - just record state
    if (userHp <= 0 || proHp <= 0) {
      timeline.push({
        tick,
        userHp: Math.max(0, userHp),
        proHp: Math.max(0, proHp),
        events,
        criticalAction,
      });
      continue;
    }

    // Process damage only at intervals
    if (tick % DAMAGE_TICK_INTERVAL === 0 && tick > 0) {
      const roll = Math.random();

      if (roll < winProbability) {
        // User wins this exchange
        const damageType = Math.random();

        if (damageType < 0.25) {
          // Big hit (win condition connects)
          const damage = 400 + Math.floor(Math.random() * 200);
          const winCon = getWinCondition(userDeck);
          events.push(`Your ${winCon} connects for ${damage} damage!`);
          proHp = Math.max(0, proHp - damage);
          criticalAction = 'rocket_hit';
        } else if (damageType < 0.6) {
          // Chip damage
          const damage = 100 + Math.floor(Math.random() * 150);
          const chipCard = getRandomCardName(userDeck);
          events.push(`Chip damage with ${chipCard}: ${damage}`);
          proHp = Math.max(0, proHp - damage);
        } else if (damageType < 0.85) {
          // Successful defense
          events.push(`${userName} successfully defended ${proName}'s push!`);
          criticalAction = 'defense_success';
        } else {
          // Counter push
          const damage = 200 + Math.floor(Math.random() * 100);
          events.push(`Counter push! ${getRandomCardName(userDeck)} deals ${damage}!`);
          proHp = Math.max(0, proHp - damage);
        }
      } else {
        // Pro wins this exchange
        const damageType = Math.random();

        if (damageType < 0.35) {
          // Pro big hit
          const damage = 350 + Math.floor(Math.random() * 250);
          const proWinCon = getWinCondition(proDeck);
          events.push(`${proName} plays ${proWinCon}! Takes ${damage} damage!`);
          userHp = Math.max(0, userHp - damage);
          criticalAction = 'rocket_hit';
        } else if (damageType < 0.7) {
          // Pro chip damage
          const damage = 80 + Math.floor(Math.random() * 120);
          const proCard = getRandomCardName(proDeck);
          events.push(`${proName}'s ${proCard} chips for ${damage}`);
          userHp = Math.max(0, userHp - damage);
        } else if (damageType < 0.85) {
          // Pro defense
          events.push(`${proName} defends perfectly and builds a counter!`);
          const damage = 150 + Math.floor(Math.random() * 100);
          userHp = Math.max(0, userHp - damage);
        } else {
          // Pro emote (flavor)
          events.push(`${proName} ${getRandomEmote()}`);
          criticalAction = 'emote';
        }
      }

      // Tower destruction events
      if (proHp <= 0 && !proTowerDestroyed) {
        events.push(`Tower Down! ${userName} destroyed ${proName}'s tower!`);
        criticalAction = 'tower_down';
        proTowerDestroyed = true;
      }
      if (userHp <= 0 && !userTowerDestroyed) {
        events.push(`Your tower has fallen to ${proName}!`);
        criticalAction = 'tower_down';
        userTowerDestroyed = true;
      }
    }

    // Add overtime announcement
    if (tick === 120 && userHp > 0 && proHp > 0) {
      events.push('⚡ OVERTIME! Double elixir begins!');
    }

    timeline.push({
      tick,
      userHp: Math.max(0, userHp),
      proHp: Math.max(0, proHp),
      events,
      criticalAction,
    });
  }

  // Step 4: Determine winner
  const userCrowns = proHp <= 0 ? 1 : 0;
  const proCrowns = userHp <= 0 ? 1 : 0;

  let winner: 'user' | 'pro';
  if (userHp <= 0 && proHp <= 0) {
    // Both towers down - whoever has more HP percentage wins
    winner = userHp >= proHp ? 'user' : 'pro';
  } else if (proHp <= 0) {
    winner = 'user';
  } else if (userHp <= 0) {
    winner = 'pro';
  } else {
    // Neither tower destroyed - HP comparison
    winner = userHp > proHp ? 'user' : userHp < proHp ? 'pro' : winProbability >= 0.5 ? 'user' : 'pro';
  }

  const finalUserCrowns = winner === 'user' ? Math.max(1, userCrowns) : userCrowns;
  const finalProCrowns = winner === 'pro' ? Math.max(1, proCrowns) : proCrowns;

  return {
    winner,
    finalScore: `${finalUserCrowns}-${finalProCrowns}`,
    winProbability,
    timeline,
  };
}

/**
 * Get a summary of key moments from the timeline
 */
export function getKeyMoments(timeline: SimulationFrame[]): SimulationFrame[] {
  return timeline.filter(
    (frame) =>
      frame.criticalAction ||
      frame.events.some((e) => e.includes('Tower') || e.includes('OVERTIME'))
  );
}

/**
 * Format time tick as MM:SS
 */
export function formatMatchTime(tick: number): string {
  const minutes = Math.floor(tick / 60);
  const seconds = tick % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
