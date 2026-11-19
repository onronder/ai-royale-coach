import { observeBattle, observeBattles, fixedElixir } from '../../supabase/functions/_shared/battle-observation';
import type { TFunction } from 'i18next';
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
function calculateAvgElixir(cards: { elixirCost?: number }[]): number | null {
  return fixedElixir(cards);
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
function checkElixirMaster(battle: ClashRoyaleBattle, index: number, t: TFunction): Achievement | null {
  if (!isWin(battle)) return null;
  
  const teamCards = battle.team?.[0]?.cards ?? [];
  const avgElixir = calculateAvgElixir(teamCards);
  const opponentCrowns = battle.opponent?.[0]?.crowns ?? 0;
  
  // Won with heavy deck (> 4.0 avg) and lost no crown; tower damage is not available
  if (avgElixir !== null && avgElixir >= 4.0 && opponentCrowns === 0) {
    return {
      id: 'elixir-master',
      title: t('achievementShowcase.achievements.elixirMaster.title'),
      icon: 'Zap',
      description: t('achievementShowcase.achievements.elixirMaster.earned'),
      rarity: 'Rare',
      matchIndex: index,
    };
  }
  return null;
}

/**
 * Check for Comeback King achievement
 * Won a match with crowns conceded; order is unknown
 */
function checkComebackKing(battle: ClashRoyaleBattle, index: number, t: TFunction): Achievement | null {
  if (!isWin(battle)) return null;
  
  // If opponent got at least 1 crown but we still won
  if (lostTower(battle)) {
    return {
      id: 'comeback-king',
      title: t('achievementShowcase.achievements.comebackKing.title'),
      icon: 'Crown',
      description: t('achievementShowcase.achievements.comebackKing.earned'),
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
function checkPerfectDefense(battle: ClashRoyaleBattle, index: number, t: TFunction): Achievement | null {
  if (!isWin(battle)) return null;
  
  const opponentCrowns = battle.opponent?.[0]?.crowns ?? 0;
  
  if (opponentCrowns === 0) {
    return {
      id: 'perfect-defense',
      title: t('achievementShowcase.achievements.perfectDefense.title'),
      icon: 'Shield',
      description: t('achievementShowcase.achievements.perfectDefense.earned'),
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
function checkWinStreakWarrior(battles: ClashRoyaleBattle[], t: TFunction): Achievement | null {
  let currentStreak = 0;
  let maxStreak = 0;
  
  // Battles are usually newest first, so we reverse to check chronologically
  const chronological = [...battles].sort((a,b) => a.battleTime.localeCompare(b.battleTime));
  
  for (const battle of chronological) {
    if (isWin(battle)) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  if (maxStreak >= 3) {
    return {
      id: 'win-streak-warrior',
      title: t('achievementShowcase.achievements.winStreakWarrior.title'),
      icon: 'Flame',
      description: t('achievementShowcase.wonStreak', { count: maxStreak }),
      rarity: maxStreak >= 5 ? 'Legendary' : maxStreak >= 4 ? 'Epic' : 'Rare',
    };
  }
  return null;
}

/**
 * Check for Underdog achievement
 * Beat an opponent with higher Trophy count
 */
function checkUnderdog(battle: ClashRoyaleBattle, index: number, t: TFunction): Achievement | null {
  if (!isWin(battle)) return null;
  
  const teamTrophies = battle.team?.[0]?.startingTrophies;
  const opponentTrophies = battle.opponent?.[0]?.startingTrophies;
  if (!Number.isFinite(teamTrophies) || !Number.isFinite(opponentTrophies)) return null;
  
  // Opponent had at least 100 more trophies
  if (opponentTrophies > teamTrophies && (opponentTrophies - teamTrophies) >= 100) {
    const difference = opponentTrophies - teamTrophies;
    const isHuge = difference >= 500;
    
    return {
      id: 'underdog',
      title: isHuge ? t('achievementShowcase.giantSlayer') : t('achievementShowcase.achievements.underdog.title'),
      icon: isHuge ? 'Star' : 'TrendingUp',
      description: t('achievementShowcase.wonAgainstOdds', { count: difference }),
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
function checkThreeCrownMaster(battle: ClashRoyaleBattle, index: number, t: TFunction): Achievement | null {
  const teamCrowns = battle.team?.[0]?.crowns ?? 0;
  
  if (teamCrowns === 3) {
    return {
      id: 'three-crown-master',
      title: t('achievementShowcase.achievements.threeCrownMaster.title'),
      icon: 'Trophy',
      description: t('achievementShowcase.achievements.threeCrownMaster.earned'),
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
export function checkAchievements(battles: ClashRoyaleBattle[], t: TFunction, playerTag: string): Achievement[] {
  const original = battles;
  const observed = observeBattles(battles, playerTag);
  const valid = observed.battles.filter(b => b.format === '1v1').map(b => {
    const index = original.findIndex(raw => observeBattle(raw, playerTag)?.key === b.key);
    const raw = original[index];
    const own = raw.team.find(p => p.tag.replace(/^#/, '').toUpperCase() === playerTag.replace(/^#/, '').toUpperCase());
    return { index, battle: own ? raw : { ...raw, team: raw.opponent, opponent: raw.team } };
  });
  battles = valid.map(v => v.battle);
  const achievementsMap = new Map<string, Achievement>();
  
  // Check per-battle achievements
  battles.forEach((battle, position) => {
    const index = valid[position].index;
    const perBattleChecks = [
      checkElixirMaster(battle, index, t),
      checkComebackKing(battle, index, t),
      checkPerfectDefense(battle, index, t),
      checkUnderdog(battle, index, t),
      checkThreeCrownMaster(battle, index, t),
    ];
    
    perBattleChecks.forEach(achievement => {
      if (achievement && !achievementsMap.has(achievement.id)) {
        achievementsMap.set(achievement.id, achievement);
      }
    });
  });
  
  // Check streak-based achievements
  const streakAchievement = checkWinStreakWarrior(battles, t);
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
