interface CardIconUrls {
  medium: string;
  evolutionMedium?: string;
}

export interface ClashRoyaleCard {
  id: number;
  name: string;
  level: number;
  maxLevel: number;
  count?: number;
  elixirCost?: number;
  rarity?: string;
  iconUrls: CardIconUrls;
  evolutionLevel?: number;
  starLevel?: number;
}

// Player from rankings endpoint (no deck data)
export interface LadderPlayer {
  rank: number;
  tag: string;
  name: string;
  trophies: number;
  expLevel: number;
  clan?: {
    tag: string;
    name: string;
    badgeId: number;
  };
  arena?: {
    id: number;
    name: string;
  };
}

// Full player profile with deck (from player endpoint)
export interface ClashRoyalePlayer {
  tag: string;
  name: string;
  trophies: number;
  bestTrophies: number;
  expLevel: number;
  arena: {
    id: number;
    name: string;
  };
  clan?: {
    tag: string;
    name: string;
    badgeId: number;
  };
  cards?: ClashRoyaleCard[];
  currentDeck?: ClashRoyaleCard[];
  wins: number;
  losses: number;
  battleCount: number;
  threeCrownWins: number;
  challengeCardsWon: number;
  challengeMaxWins: number;
  tournamentCardsWon: number;
  tournamentBattleCount: number;
  donations: number;
  donationsReceived: number;
  totalDonations: number;
}

export interface ClashRoyaleBattle {
  type: string;
  battleTime: string;
  isLadderTournament: boolean;
  arena: {
    id: number;
    name: string;
  };
  gameMode: {
    id: number;
    name: string;
  };
  deckSelection: string;
  team: Array<{
    tag: string;
    name: string;
    startingTrophies?: number;
    trophyChange?: number;
    crowns: number;
    cards: ClashRoyaleCard[];
  }>;
  opponent: Array<{
    tag: string;
    name: string;
    startingTrophies?: number;
    trophyChange?: number;
    crowns: number;
    cards: ClashRoyaleCard[];
  }>;
}

export interface BattleLogResponse {
  battles: ClashRoyaleBattle[];
}

export interface GlobalRankingsResponse {
  items: LadderPlayer[];
}

class ClashRoyaleApiService {
  private async callEdgeFunction<T>(endpoint: string, playerTag?: string, params?: Record<string, string>): Promise<T> {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = new URL(
      `https://${projectId}.supabase.co/functions/v1/clash-royale-api`
    );
    url.searchParams.set('endpoint', endpoint);
    if (playerTag) {
      url.searchParams.set('playerTag', playerTag);
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to fetch ${endpoint}`);
    }

    return await response.json();
  }

  async getPlayer(playerTag: string): Promise<ClashRoyalePlayer> {
    return this.callEdgeFunction<ClashRoyalePlayer>('player', playerTag);
  }

  async getBattleLog(playerTag: string): Promise<ClashRoyaleBattle[]> {
    return this.callEdgeFunction<ClashRoyaleBattle[]>('battles', playerTag);
  }

  async getGlobalTopLadder(limit: number = 10): Promise<LadderPlayer[]> {
    const response = await this.callEdgeFunction<GlobalRankingsResponse>('rankings', undefined, { 
      limit: limit.toString() 
    });
    return response.items || [];
  }

  normalizeTag(tag: string): string {
    return tag.replace(/^#/, '').toUpperCase();
  }

  formatTag(tag: string): string {
    const normalized = this.normalizeTag(tag);
    return `#${normalized}`;
  }
}

export const clashRoyaleApi = new ClashRoyaleApiService();
