/**
 * Dashboard Types - Proper type definitions to replace `any` usage
 */

import { Database, Json } from '@/integrations/supabase/types';

// Database row types
export type DeckUsageStatRow = Database['public']['Tables']['deck_usage_stats']['Row'];
export type CardMasteryRow = Database['public']['Tables']['card_mastery']['Row'];
export type SavedDeckRow = Database['public']['Tables']['saved_decks']['Row'];
export type CardCollectionRow = Database['public']['Tables']['card_collection']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type AchievementRow = Database['public']['Tables']['achievements']['Row'];
export type UserAchievementRow = Database['public']['Tables']['user_achievements']['Row'];

// User achievement with joined achievement data
export interface UserAchievementWithDetails extends UserAchievementRow {
  achievement: AchievementRow | null;
}

// Player context data for dashboard
export interface PlayerContextData {
  savedDecks: SavedDeckRow[];
  cardMastery: CardMasteryRow[];
  achievements: UserAchievementWithDetails[];
  cardCollection: CardCollectionRow[];
}

// Notification type enum (matches database column)
export type NotificationType = 'achievement' | 'sync' | 'calculation' | 'info' | 'success' | 'error';

// Extended notification with proper metadata typing
export interface TypedNotification extends Omit<NotificationRow, 'type' | 'metadata'> {
  type: NotificationType;
  metadata?: Record<string, unknown>;
}

// Aggregated deck stat - from useDeckStats hook
export interface AggregatedDeckStat {
  id: string;
  deck_cards: string[];
  deck_hash: string;
  battles_played: number;
  battles_won: number;
  battles_lost: number;
  total_crowns: number;
  total_trophy_change: number;
  avg_elixir: number;
  date: string;
  win_rate: number;
}
