import type { ClashRoyaleBattle } from '@/services/clashRoyaleApi';

export interface PlayerDNA {
  stats: {
    aggression: number;  // 0-100
    defense: number;     // 0-100
    versatility: number; // 0-100
  };
  archetype: string;
  similarPro: string;
  description: string;
}

interface BattleStats {
  wins: number;
  losses: number;
  threeCrowns: number;
  totalCrownsWon: number;
  totalCrownsLost: number;
  threeCrownsLost: number;
  uniqueCardsUsed: Set<string>;
  uniqueDecksUsed: Set<string>;
}

function normalizeTag(tag: string): string {
  return tag.replace(/^#/, '').toUpperCase();
}

function getDeckHash(cards: { name: string }[]): string {
  return [...cards.map(c => c.name)].sort().join('|');
}

function classifyArchetype(stats: PlayerDNA['stats']): Omit<PlayerDNA, 'stats'> {
  const { aggression, defense, versatility } = stats;

  if (aggression > 75) {
    return {
      archetype: "Bridge Spammer",
      similarPro: "Mohamed Light",
      description: "Relentless aggression! You overwhelm opponents with constant pressure at the bridge."
    };
  }
  if (defense > 75) {
    return {
      archetype: "The Great Wall",
      similarPro: "Morten",
      description: "Defensive genius! You frustrate opponents by barely letting any damage through."
    };
  }
  if (versatility > 70) {
    return {
      archetype: "Meta Breaker",
      similarPro: "Erben",
      description: "Unpredictable and adaptive! You master multiple decks and surprise opponents."
    };
  }
  if (aggression > 60 && defense > 60) {
    return {
      archetype: "Balanced Warrior",
      similarPro: "Boss",
      description: "Well-rounded player! You balance offense and defense with solid fundamentals."
    };
  }
  return {
    archetype: "Tactical Mastermind",
    similarPro: "Mugi",
    description: "Patient and calculated! You wait for the perfect moment to strike decisively."
  };
}

export function calculatePlayerDNA(
  battles: ClashRoyaleBattle[],
  playerTag: string
): PlayerDNA {
  // Handle empty battles
  if (!battles || battles.length === 0) {
    return {
      stats: { aggression: 50, defense: 50, versatility: 50 },
      archetype: "Unknown",
      similarPro: "Unknown",
      description: "Not enough battle data to analyze your playstyle yet."
    };
  }

  const normalizedTag = normalizeTag(playerTag);
  
  const battleStats: BattleStats = {
    wins: 0,
    losses: 0,
    threeCrowns: 0,
    totalCrownsWon: 0,
    totalCrownsLost: 0,
    threeCrownsLost: 0,
    uniqueCardsUsed: new Set(),
    uniqueDecksUsed: new Set()
  };

  // Process each battle
  for (const battle of battles) {
    const teamPlayer = battle.team.find(p => normalizeTag(p.tag) === normalizedTag);
    if (!teamPlayer) continue;

    const opponentPlayer = battle.opponent[0];
    const playerCrowns = teamPlayer.crowns ?? 0;
    const opponentCrowns = opponentPlayer?.crowns ?? 0;

    // Win/Loss tracking
    if (playerCrowns > opponentCrowns) {
      battleStats.wins++;
      if (playerCrowns === 3) {
        battleStats.threeCrowns++;
      }
    } else if (playerCrowns < opponentCrowns) {
      battleStats.losses++;
      if (opponentCrowns === 3) {
        battleStats.threeCrownsLost++;
      }
    }

    // Crown tracking
    battleStats.totalCrownsWon += playerCrowns;
    battleStats.totalCrownsLost += opponentCrowns;

    // Card & deck tracking
    if (teamPlayer.cards) {
      for (const card of teamPlayer.cards) {
        battleStats.uniqueCardsUsed.add(card.name);
      }
      battleStats.uniqueDecksUsed.add(getDeckHash(teamPlayer.cards));
    }
  }

  const totalBattles = battleStats.wins + battleStats.losses;
  
  // Handle case where player wasn't found in any battles
  if (totalBattles === 0) {
    return {
      stats: { aggression: 50, defense: 50, versatility: 50 },
      archetype: "Unknown",
      similarPro: "Unknown",
      description: "Could not find your data in the battle history."
    };
  }

  // Calculate Aggression (0-100)
  const threeCrownRate = battleStats.wins > 0 
    ? (battleStats.threeCrowns / battleStats.wins) * 100 
    : 0;
  const avgCrownsWon = (battleStats.totalCrownsWon / totalBattles) / 3 * 100;
  const winRate = (battleStats.wins / totalBattles) * 100;
  
  const aggression = Math.round(
    Math.min(100, Math.max(0,
      (threeCrownRate * 0.5) + (avgCrownsWon * 0.3) + (winRate * 0.2)
    ))
  );

  // Calculate Defense (0-100)
  const avgCrownsLost = battleStats.totalCrownsLost / totalBattles;
  const threeCrownLostRate = totalBattles > 0 
    ? battleStats.threeCrownsLost / totalBattles 
    : 0;
  
  const defense = Math.round(
    Math.min(100, Math.max(0,
      ((1 - avgCrownsLost / 3) * 100 * 0.7) + 
      ((1 - threeCrownLostRate) * 100 * 0.3)
    ))
  );

  // Calculate Versatility (0-100)
  // 40+ unique cards = max versatility, 10+ decks = max versatility
  const uniqueCardRatio = Math.min(battleStats.uniqueCardsUsed.size / 40, 1);
  const uniqueDeckRatio = Math.min(battleStats.uniqueDecksUsed.size / 10, 1);
  
  const versatility = Math.round(
    Math.min(100, Math.max(0,
      (uniqueCardRatio * 100 * 0.6) + (uniqueDeckRatio * 100 * 0.4)
    ))
  );

  const stats = { aggression, defense, versatility };
  const classification = classifyArchetype(stats);

  // Add disclaimer for few battles
  let description = classification.description;
  if (totalBattles < 5) {
    description = `${description} (Based on limited data: ${totalBattles} battles)`;
  }

  return {
    stats,
    archetype: classification.archetype,
    similarPro: classification.similarPro,
    description
  };
}
