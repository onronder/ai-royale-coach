// This file previously contained hardcoded pro player data.
// All player data is now fetched from the live Clash Royale API.
// See src/services/clashRoyaleApi.ts for LadderPlayer and related types.

// Re-export types from the API service for backward compatibility
export type { LadderPlayer, ClashRoyalePlayer as BattlePlayer } from '@/services/clashRoyaleApi';

// Legacy type alias - deprecated, use LadderPlayer instead
export interface ProPlayerProfile {
  id: string;
  name: string;
  tag: string;
  avatarUrl?: string;
  archetype?: string;
  playstyle?: string;
  specialty?: string;
}

// Empty array for backward compatibility during migration
// Components should migrate to useGlobalLeaderboard hook
export const PRO_PLAYER_PROFILES: ProPlayerProfile[] = [];
export const PRO_PLAYERS = PRO_PLAYER_PROFILES;
