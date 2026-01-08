import type { ClashRoyaleBattle } from "@/services/clashRoyaleApi";

export type AchievementRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface Achievement {
  id: string;
  title: string;
  icon: string; // Lucide icon name
  description: string;
  rarity: AchievementRarity;
  matchIndex?: number; // Which match triggered this achievement
}

/**
 * Calculate average elixir cost of a deck
 */
function calculateAvgElixir(cards: { elixirCost?: number }[]): number {
  const costs = cards.filter(c => c.elixirCost !== undefined).map(c => c.elixirCost!);
  if (costs.length === 0) return 0;
  return costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
}

/**
 * Check if player won the battle
 */
function isWin(battle: ClashRoyaleBattle): boolean {
  if (!battle.team?.[0] || !battle.opponent?.[0]) return false;
  return battle.team[0].crowns > battle.opponent[0].crowns;
}

/**
 * Check if player lost a tower (opponent got at least 1 crown)
 */
function lostTower(battle: ClashRoyaleBattle): boolean {
  return (battle.opponent?.[0]?.crowns ?? 0) >= 1;
}

/**
 * Check for Elixir Master achievement
 * Win with high elixir deck (> 4.0) without losing any towers
 */
function checkElixirMaster(battle: ClashRoyaleBattle, index: number): Achievement | null {
  if (!isWin(battle)) return null;
  
  const teamCards = battle.team?.[0]?.cards ?? [];
  const avgElixir = calculateAvgElixir(teamCards);
  const opponentCrowns = battle.opponent?.[0]?.crowns ?? 0;
  
  // Won with heavy deck (> 4.0 avg) and took no damage (0 crowns lost)
  if (avgElixir > 4.0 && opponentCrowns === 0) {
    return {
      id: 'elixir-master',
      title: '⚡ Elixir Master',
      icon: 'Zap',
      description: 'You dominated with a heavy deck and kept all your towers safe!',
      rarity: 'Rare',
      matchIndex: index,
    };
  }
  return null;
}

/**
 * Check for Comeback King achievement
 * Won a match after losing a tower first (opponent scored first but you won)
 */
function checkComebackKing(battle: ClashRoyaleBattle, index: number): Achievement | null {
  if (!isWin(battle)) return null;
  
  // If opponent got at least 1 crown but we still won
  if (lostTower(battle)) {
    return {
      id: 'comeback-king',
      title: '👑 Comeback King',
      icon: 'Crown',
      description: 'Never give up! You turned the battle around like a true champion!',
      rarity: 'Epic',
      matchIndex: index,
    };
  }
  return null;
}

/**
 * Check for Perfect Defense achievement
 * Won a match with 0 crowns lost (perfect defense)
 */
function checkPerfectDefense(battle: ClashRoyaleBattle, index: number): Achievement | null {
  if (!isWin(battle)) return null;
  
  const opponentCrowns = battle.opponent?.[0]?.crowns ?? 0;
  
  if (opponentCrowns === 0) {
    return {
      id: 'perfect-defense',
      title: '🛡️ Perfect Defense',
      icon: 'Shield',
      description: 'You defended your towers like a pro! Not a single crown lost!',
      rarity: 'Rare',
      matchIndex: index,
    };
  }
  return null;
}

/**
 * Check for Win Streak Warrior achievement
 * Won 3+ games in a row
 */
function checkWinStreakWarrior(battles: ClashRoyaleBattle[]): Achievement | null {
  let currentStreak = 0;
  let maxStreak = 0;
  
  // Battles are usually newest first, so we reverse to check chronologically
  const chronological = [...battles].reverse();
  
  for (const battle of chronological) {
    if (isWin(battle)) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  if (maxStreak >= 3) {
    const streakText = maxStreak >= 5 ? 'an incredible' : maxStreak >= 4 ? 'an amazing' : 'a';
    return {
      id: 'win-streak-warrior',
      title: '🔥 Win Streak Warrior',
      icon: 'Flame',
      description: `You're on fire! ${streakText} ${maxStreak}-win streak shows your skills!`,
      rarity: maxStreak >= 5 ? 'Legendary' : maxStreak >= 4 ? 'Epic' : 'Rare',
    };
  }
  return null;
}

/**
 * Check for Underdog achievement
 * Beat an opponent with higher Trophy count
 */
function checkUnderdog(battle: ClashRoyaleBattle, index: number): Achievement | null {
  if (!isWin(battle)) return null;
  
  const teamTrophies = battle.team?.[0]?.startingTrophies ?? 0;
  const opponentTrophies = battle.opponent?.[0]?.startingTrophies ?? 0;
  
  // Opponent had at least 100 more trophies
  if (opponentTrophies > teamTrophies && (opponentTrophies - teamTrophies) >= 100) {
    const difference = opponentTrophies - teamTrophies;
    const isHuge = difference >= 500;
    
    return {
      id: 'underdog',
      title: isHuge ? '🌟 Giant Slayer' : '💪 Underdog',
      icon: isHuge ? 'Star' : 'TrendingUp',
      description: isHuge 
        ? `Incredible! You defeated someone ${difference} trophies above you!`
        : `You proved skill beats trophies! Beat someone ${difference} trophies higher!`,
      rarity: isHuge ? 'Legendary' : 'Epic',
      matchIndex: index,
    };
  }
  return null;
}

/**
 * Check for Three Crown Master
 * Got a 3-crown victory
 */
function checkThreeCrownMaster(battle: ClashRoyaleBattle, index: number): Achievement | null {
  const teamCrowns = battle.team?.[0]?.crowns ?? 0;
  
  if (teamCrowns === 3) {
    return {
      id: 'three-crown-master',
      title: '🏆 Three Crown Master',
      icon: 'Trophy',
      description: 'Total domination! You took all three crowns!',
      rarity: 'Common',
      matchIndex: index,
    };
  }
  return null;
}

/**
 * Main function to check all achievements from battle history
 * Returns unique achievements (no duplicates by id)
 */
export function checkAchievements(battles: ClashRoyaleBattle[]): Achievement[] {
  const achievementsMap = new Map<string, Achievement>();
  
  // Check per-battle achievements
  battles.forEach((battle, index) => {
    const perBattleChecks = [
      checkElixirMaster(battle, index),
      checkComebackKing(battle, index),
      checkPerfectDefense(battle, index),
      checkUnderdog(battle, index),
      checkThreeCrownMaster(battle, index),
    ];
    
    perBattleChecks.forEach(achievement => {
      if (achievement && !achievementsMap.has(achievement.id)) {
        achievementsMap.set(achievement.id, achievement);
      }
    });
  });
  
  // Check streak-based achievements
  const streakAchievement = checkWinStreakWarrior(battles);
  if (streakAchievement && !achievementsMap.has(streakAchievement.id)) {
    achievementsMap.set(streakAchievement.id, streakAchievement);
  }
  
  // Sort by rarity (Legendary > Epic > Rare > Common)
  const rarityOrder: Record<AchievementRarity, number> = {
    'Legendary': 4,
    'Epic': 3,
    'Rare': 2,
    'Common': 1,
  };
  
  return Array.from(achievementsMap.values()).sort(
    (a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]
  );
}

/**
 * Get rarity color class for styling
 */
export function getRarityColorClass(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'Legendary':
      return 'text-amber-400 bg-amber-500/20 border-amber-500/50';
    case 'Epic':
      return 'text-purple-400 bg-purple-500/20 border-purple-500/50';
    case 'Rare':
      return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
    case 'Common':
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
  }
}
