/**
 * API Response Types - Type definitions for edge function responses and API data
 */

import { LucideIcon } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

// Subscription-aware API response wrapper
export interface SubscriptionRequiredResponse {
  subscription_required: boolean;
}

// Type guard to check if response requires subscription
export function isSubscriptionRequired(data: unknown): data is SubscriptionRequiredResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'subscription_required' in data &&
    (data as SubscriptionRequiredResponse).subscription_required === true
  );
}

// Custom error with subscription flag
export class SubscriptionRequiredError extends Error {
  subscription_required = true;
  constructor(message = 'Subscription required') {
    super(message);
    this.name = 'SubscriptionRequiredError';
  }
}

// Player cache data structure (from Clash Royale API)
export interface CachedPlayerData {
  name?: string;
  trophies?: number;
  bestTrophies?: number;
  arena?: {
    name?: string;
  };
  clan?: {
    name?: string;
    badgeId?: number;
  };
  wins?: number;
  losses?: number;
  battleCount?: number;
  threeCrownWins?: number;
  challengeMaxWins?: number;
  challengeCardsWon?: number;
  donations?: number;
  donationsReceived?: number;
  warDayWins?: number;
  expLevel?: number;
}

// Helper to safely cast JSON player data
export function parseCachedPlayerData(data: Json | null | undefined): CachedPlayerData | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  return data as unknown as CachedPlayerData;
}

// Dynamic Lucide icon lookup type
export type LucideIconName = string;

// Icon lookup helper with type safety
export function getLucideIcon(
  icons: Record<string, LucideIcon>,
  name: string,
  fallback: LucideIcon
): LucideIcon {
  return (icons[name] as LucideIcon) || fallback;
}

// Browser API type extensions for PWA
export interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

// Helper to check iOS standalone mode
export function isIOSStandalone(): boolean {
  return (navigator as NavigatorWithStandalone).standalone === true;
}

// Helper to detect iOS device
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    !(window as WindowWithMSStream).MSStream;
}

// Saved deck cards type (JSON array of card names)
export type DeckCardsJson = string[];

// Helper to parse deck cards from JSON
export function parseDeckCards(cards: Json): string[] {
  if (Array.isArray(cards)) {
    return cards.filter((c): c is string => typeof c === 'string');
  }
  return [];
}
