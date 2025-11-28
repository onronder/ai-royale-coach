# AI Royale - Data Provenance Documentation

> **Last Updated:** November 28, 2025  
> **Version:** 1.0  
> **Purpose:** Complete mapping of all data flows from source to display

---

## Table of Contents

1. [Overview](#overview)
2. [Data Source Architecture](#data-source-architecture)
3. [Category 1: Direct API Data](#category-1-direct-api-data)
4. [Category 2: Calculated Metrics](#category-2-calculated-metrics)
5. [Category 3: AI-Generated Insights](#category-3-ai-generated-insights)
6. [Edge Function Reference](#edge-function-reference)
7. [Caching Strategy](#caching-strategy)
8. [Data Validation & Integrity](#data-validation--integrity)

---

## Overview

AI Royale processes three distinct categories of data:

| Category | Source | Verification | Examples |
|----------|--------|--------------|----------|
| **Direct API** | Clash Royale API via RoyaleAPI proxy | 100% verifiable | Player name, trophies, card levels |
| **Calculated** | Derived from battle history | Formula-based, auditable | Win rate, trophy trends |
| **AI-Generated** | Lovable AI Gateway | AI model output, cached | Player analysis, deck recommendations |

---

## Data Source Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Clash Royale API                            │
│                (proxy.royaleapi.dev/v1)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              clash-royale-api Edge Function                     │
│         (Rate limiting, caching, normalization)                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
    ┌───────────┐ ┌───────────┐ ┌───────────────┐
    │player_cache│ │Calculation│ │   AI Edge     │
    │   table   │ │  Functions│ │  Functions    │
    └───────────┘ └─────┬─────┘ └───────┬───────┘
                        │               │
           ┌────────────┼───────────────┼────────────┐
           ▼            ▼               ▼            ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
    │deck_usage │ │card_mastery│ │ analyses │ │chat_messages│
    │  _stats   │ │   table   │ │  table   │ │   table   │
    └───────────┘ └───────────┘ └───────────┘ └───────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  React Frontend │
              │   Components    │
              └─────────────────┘
```

---

## Category 1: Direct API Data

Data retrieved directly from Clash Royale API and displayed without transformation.

### Player Profile Data

| Field | API Source | Display Location | Component |
|-------|-----------|------------------|-----------|
| `player.name` | `/players/{tag}` | Dashboard header | `DashboardHeader.tsx` |
| `player.tag` | `/players/{tag}` | Dashboard header, everywhere | `DashboardHeader.tsx` |
| `player.trophies` | `/players/{tag}` | Overview tab, leaderboard | `OverviewTab.tsx`, `StatCard.tsx` |
| `player.bestTrophies` | `/players/{tag}` | Overview tab | `OverviewTab.tsx` |
| `player.expLevel` | `/players/{tag}` | Player selector | `PlayerTagSelector.tsx` |
| `player.arena.name` | `/players/{tag}` | Overview tab | `OverviewTab.tsx` |
| `player.clan.name` | `/players/{tag}` | Dashboard header | `DashboardHeader.tsx` |
| `player.clan.tag` | `/players/{tag}` | Clan links | `DashboardHeader.tsx` |
| `player.wins` | `/players/{tag}` | Stats display | `OverviewTab.tsx` |
| `player.losses` | `/players/{tag}` | Stats display | `OverviewTab.tsx` |
| `player.battleCount` | `/players/{tag}` | Stats display | `OverviewTab.tsx` |
| `player.threeCrownWins` | `/players/{tag}` | Stats display | `OverviewTab.tsx` |

### Current Deck Data

| Field | API Source | Display Location | Component |
|-------|-----------|------------------|-----------|
| `currentDeck[].name` | `/players/{tag}` | Deck tab | `DeckTab.tsx`, `DeckGrid.tsx` |
| `currentDeck[].level` | `/players/{tag}` | Card display (converted) | `CardImage.tsx` |
| `currentDeck[].maxLevel` | `/players/{tag}` | Level calculation | `CardImage.tsx` |
| `currentDeck[].evolutionLevel` | `/players/{tag}` | Evolution badge | `CardImage.tsx` |
| `currentDeck[].iconUrls.medium` | `/players/{tag}` | Card images | `CardImage.tsx` |
| `currentDeck[].elixirCost` | `/players/{tag}` | Elixir calculations | `DeckAnalysisPanel.tsx` |

### Battle Log Data

| Field | API Source | Display Location | Component |
|-------|-----------|------------------|-----------|
| `battle.type` | `/players/{tag}/battlelog` | Match card | `MatchCard.tsx` |
| `battle.battleTime` | `/players/{tag}/battlelog` | Match timestamp | `MatchCard.tsx` |
| `battle.arena.name` | `/players/{tag}/battlelog` | Match details | `MatchDetailView.tsx` |
| `battle.gameMode.name` | `/players/{tag}/battlelog` | Match card | `MatchCard.tsx` |
| `battle.team[0].crowns` | `/players/{tag}/battlelog` | Win/loss indicator | `MatchCard.tsx` |
| `battle.team[0].trophyChange` | `/players/{tag}/battlelog` | Trophy change badge | `MatchCard.tsx` |
| `battle.team[0].cards[]` | `/players/{tag}/battlelog` | Deck display | `MatchCard.tsx`, `MatchDetailView.tsx` |
| `battle.opponent[0].name` | `/players/{tag}/battlelog` | Opponent info | `MatchCard.tsx` |
| `battle.opponent[0].crowns` | `/players/{tag}/battlelog` | Score display | `MatchCard.tsx` |
| `battle.opponent[0].cards[]` | `/players/{tag}/battlelog` | Opponent deck | `MatchDetailView.tsx` |

### Card Collection Data

| Field | API Source | Display Location | Component |
|-------|-----------|------------------|-----------|
| `cards[].id` | `/players/{tag}` | Card tracking | `CardCollectionTracker.tsx` |
| `cards[].name` | `/players/{tag}` | Card name | `CardCollectionTracker.tsx` |
| `cards[].level` | `/players/{tag}` | Card level (converted) | `CardCollectionTracker.tsx` |
| `cards[].count` | `/players/{tag}` | Card quantity | `CardCollectionTracker.tsx` |
| `cards[].rarity` | `/players/{tag}` | Rarity filter | `CardCollectionTracker.tsx` |

### Leaderboard Data

| Field | API Source | Display Location | Component |
|-------|-----------|------------------|-----------|
| `players[].name` | `/locations/{id}/rankings/players` | Leaderboard table | `LeaderboardView.tsx` |
| `players[].tag` | `/locations/{id}/rankings/players` | Leaderboard table | `LeaderboardView.tsx` |
| `players[].trophies` | `/locations/{id}/rankings/players` | Trophy column | `LeaderboardView.tsx` |
| `players[].clan.name` | `/locations/{id}/rankings/players` | Clan column | `LeaderboardView.tsx` |

---

## Category 2: Calculated Metrics

Data derived from API data using documented formulas.

### Win Rate Calculation

**Location:** `OverviewTab.tsx`, `analyze-player/index.ts`

```typescript
// Formula
const wins = battles.filter(b => b.team[0].crowns > b.opponent[0].crowns).length;
const winRate = (wins / battles.length) * 100;
```

| Metric | Formula | Input Data | Display Location |
|--------|---------|------------|------------------|
| Win Rate % | `(wins / total_battles) * 100` | `battles[]` from API | `OverviewTab.tsx` |
| Recent Wins | `count where team.crowns > opponent.crowns` | Last 20 battles | `OverviewTab.tsx` |
| Recent Losses | `total_recent - wins` | Last 20 battles | `OverviewTab.tsx` |

### Trophy Trend Calculation

**Location:** `analyze-player/index.ts`

```typescript
// Formula
const avgTrophyChange = battles.reduce((sum, b) => 
  sum + (b.team[0].trophyChange || 0), 0
) / battles.length;
```

| Metric | Formula | Input Data | Display Location |
|--------|---------|------------|------------------|
| Avg Trophy Change | `sum(trophyChange) / battles.length` | `battles[].team[0].trophyChange` | `OverviewTab.tsx` |

### Card Display Level Calculation

**Location:** `src/utils/cardLevelCalculator.ts`

```typescript
// Universal Formula
const displayLevel = level + (16 - maxLevel);
```

| Rarity | API maxLevel | Offset | Display Range |
|--------|--------------|--------|---------------|
| Common | 16 | 0 | 1-16 |
| Rare | 14 | +2 | 3-16 |
| Epic | 11 | +5 | 6-16 |
| Legendary | 8 | +8 | 9-16 |
| Champion | 6 | +10 | 11-16 |

### Card Mastery Calculation

**Location:** `calculate-card-mastery/index.ts`

```typescript
// Mastery Score Formula (0-100)
const usageScore = Math.min(times_used / 500, 1) * 40;  // 40% weight
const winScore = (battles_won / total_battles) * 35;    // 35% weight
const crownScore = (total_crowns / times_used / 3) * 25; // 25% weight
const totalScore = usageScore + winScore + crownScore;

// Mastery Level (1-10)
const masteryLevel = Math.max(1, Math.min(10, Math.ceil(totalScore / 10)));
```

| Metric | Formula | Storage | Display Location |
|--------|---------|---------|------------------|
| Mastery Level | `ceil(totalScore / 10)` clamped 1-10 | `card_mastery.mastery_level` | `CardMasteryTracker.tsx` |
| Mastery Progress | `(totalScore % 10) * 10` | `card_mastery.mastery_progress` | `MasteryProgressRing.tsx` |
| Best Partners | Top 3 cards in winning decks | `card_mastery.best_partner_cards` | `CardMasteryCard.tsx` |
| Worst Matchups | Top 3 opponent cards on losses | `card_mastery.worst_matchup_cards` | `CardMasteryCard.tsx` |

### Deck Usage Statistics

**Location:** `track-deck-stats/index.ts`

```typescript
// Per-deck aggregation
stats.battles_played++;
if (playerCrowns > opponentCrowns) stats.battles_won++;
else stats.battles_lost++;
stats.total_crowns += playerCrowns;
stats.total_trophy_change += trophyChange;
```

| Metric | Formula | Storage | Display Location |
|--------|---------|---------|------------------|
| Deck Win Rate | `battles_won / battles_played * 100` | `deck_usage_stats` | `DeckStatsDashboard.tsx` |
| Deck Usage | `count of battles per deck hash` | `deck_usage_stats.battles_played` | `DeckUsageBreakdown.tsx` |
| Trophy Change | `sum(trophyChange)` | `deck_usage_stats.total_trophy_change` | `DeckTrendChart.tsx` |

### Archetype Detection

**Location:** `analyze-deck/index.ts`

```typescript
// Match deck cards against archetype key_cards
for (const archetype of archetypes) {
  const matches = archetype.key_cards.filter(card => 
    deckCards.some(deckCard => deckCard.toLowerCase().includes(card.toLowerCase()))
  ).length;
  if (matches > maxMatches) {
    detectedArchetype = archetype;
  }
}
```

| Input | Source | Output | Display Location |
|-------|--------|--------|------------------|
| `deck_archetypes.key_cards` | Database | Detected archetype name | `ArchetypeTag.tsx` |
| `player.currentDeck` | API | Archetype + playstyle | `DeckAnalysisPanel.tsx` |

### Archetype Win Rates

**Location:** `analyze-deck/index.ts`

```typescript
// Track wins/losses against each opponent archetype
archetypeStats.set(opponentArchetype, {
  wins: stats.wins + (isWin ? 1 : 0),
  losses: stats.losses + (isWin ? 0 : 1)
});
const winRate = (stats.wins / (stats.wins + stats.losses)) * 100;
```

| Metric | Formula | Data Source | Display Location |
|--------|---------|-------------|------------------|
| vs Archetype Win Rate | `wins_vs_archetype / battles_vs_archetype * 100` | Battle history | `DeckAnalysisPanel.tsx` |

---

## Category 3: AI-Generated Insights

Content generated by AI models via Lovable AI Gateway.

### Player Analysis Summary

**Edge Function:** `analyze-player/index.ts`  
**Model:** `google/gemini-2.5-flash`  
**Caching:** 24 hours, keyed by `profile_{tag}_{trophies}_{battleIds}_{language}`

| Output Field | Description | Display Location |
|--------------|-------------|------------------|
| `analysis` | Markdown text with Strengths, Weaknesses, Recommendations | `OverviewTab.tsx` |

**Input Context:**
- Player name, tag, trophies, best trophies
- Arena name, clan name
- Win rate and trophy change (calculated)
- Current deck with display levels
- Battle type distribution

### Deck Analysis

**Edge Function:** `analyze-deck/index.ts`  
**Model:** `google/gemini-2.5-flash`  
**Output:** Structured JSON via tool calling

| Output Field | Type | Description | Display Location |
|--------------|------|-------------|------------------|
| `strengths[]` | string[] | 3 key deck strengths | `DeckAnalysisPanel.tsx` |
| `weaknesses[]` | string[] | 3 key vulnerabilities | `DeckAnalysisPanel.tsx` |
| `recommendations[]` | string[] | 3 improvement suggestions | `DeckAnalysisPanel.tsx` |
| `archetype_tips` | string | Playstyle guidance | `DeckAnalysisPanel.tsx` |

### Advanced Deck Analysis

**Edge Function:** `analyze-deck-advanced/index.ts`  
**Model:** `google/gemini-2.5-flash`  
**Analysis Types:** Elixir trades, synergy matrix, matchup predictions

| Analysis Type | Output | Display Location |
|---------------|--------|------------------|
| Elixir Analysis | Trade scenarios, defensive/offensive split | `ElixirAnalysisCard.tsx` |
| Synergy Matrix | 8x8 card relationship scores | `SynergyMatrix.tsx` |
| Matchup Predictions | Confidence % vs common archetypes | `MatchupPredictions.tsx` |

### Match Analysis

**Edge Function:** `analyze-match/index.ts`  
**Model:** `google/gemini-2.5-flash`

| Output Field | Description | Display Location |
|--------------|-------------|------------------|
| `deckMatchup` | Analysis of deck vs opponent deck | `MatchDetailView.tsx` |
| `whatHappened` | Battle narrative and key moments | `MatchDetailView.tsx` |
| `recommendations[]` | Improvement tips for future | `MatchDetailView.tsx` |
| `keyMoments[]` | Pivotal card interactions | `MatchDetailView.tsx` |
| `counterDeck` | Suggested 8-card counter deck | `CounterDeckModal.tsx` |

### AI Coach Chat

**Edge Function:** `coach-chat/index.ts`  
**Model:** `google/gemini-2.5-flash`  
**Mode:** Streaming SSE

**Context Provided to AI:**
- Player stats (trophies, arena, win rate)
- Recent match performance
- Saved decks with win rates
- Card mastery data (top 5 cards)
- Achievement progress
- Card collection summary

| Feature | Description | Display Location |
|---------|-------------|------------------|
| Streaming responses | Real-time token output | `CoachChatPanel.tsx` |
| Conversation memory | Full history sent each request | `chat_messages` table |
| Multi-language | Responds in user's selected language | All 5 locales |

### Card Tips Generation

**Edge Function:** `generate-card-tips/index.ts`  
**Model:** `google/gemini-2.5-flash`

| Output | Description | Display Location |
|--------|-------------|------------------|
| `ai_tips` | Personalized card usage tips | `CardMasteryCard.tsx` |

---

## Edge Function Reference

### Data Retrieval Functions

| Function | Purpose | Auth Required | Cache TTL |
|----------|---------|---------------|-----------|
| `clash-royale-api` | Proxy to Clash Royale API | No | 5min (player), 2min (battles) |
| `search-clans` | Search clans by name/tag | No | None |
| `sync-leaderboard` | Fetch global rankings | Yes | None |

### Calculation Functions

| Function | Purpose | Auth Required | Writes To |
|----------|---------|---------------|-----------|
| `track-deck-stats` | Aggregate deck performance | Yes | `deck_usage_stats` |
| `calculate-card-mastery` | Calculate mastery levels | Yes | `card_mastery` |
| `calculate-player-stats` | Aggregate player metrics | Yes | Internal |
| `sync-card-collection` | Sync card inventory | Yes | `card_collection` |
| `sync-achievements` | Check achievement progress | Yes | `user_achievements` |

### AI Analysis Functions

| Function | Purpose | Auth Required | Cache Location |
|----------|---------|---------------|----------------|
| `analyze-player` | Profile summary | Yes | `analyses` table |
| `analyze-deck` | Deck strengths/weaknesses | Yes | None (real-time) |
| `analyze-deck-advanced` | Elixir/synergy/matchups | Yes | `saved_decks` columns |
| `analyze-deck-builder` | Deck building suggestions | Yes | None |
| `analyze-match` | Battle analysis | Yes | None |
| `analyze-meta-trends` | Meta analysis | Yes | None |
| `coach-chat` | AI coaching chat | Yes | `chat_messages` |
| `generate-card-tips` | Card-specific tips | Yes | `card_mastery.ai_tips` |
| `suggest-card-replacements` | Alternative cards | Yes | None |
| `predict-deck-performance` | Trophy/win predictions | Yes | None |

---

## Caching Strategy

### Frontend Caching (React Query)

| Query Key | Stale Time | GC Time | Refetch |
|-----------|------------|---------|---------|
| `clash-player` | 5 minutes | 10 minutes | Manual |
| `clash-battles` | 2 minutes | 5 minutes | Manual |
| `player-analysis` | 24 hours | 48 hours | On demand |
| `deck-stats` | 30 seconds | 5 minutes | On invalidate |

### Database Caching

| Table | TTL | Key Pattern |
|-------|-----|-------------|
| `player_cache` | 5 min (player), 2 min (battles) | `player_tag` |
| `analyses` | 24 hours | `player_tag + analysis_type + fingerprint` |

### Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| API requests | 30 | 60 seconds |
| AI quota (free) | 10 | Per day |

---

## Data Validation & Integrity

### Validation Rules

1. **Player Tags**: Normalized to uppercase, `#` prefix stripped for storage
2. **Card Levels**: Always converted using `displayLevel = level + (16 - maxLevel)`
3. **Win/Loss**: Determined by `team[0].crowns > opponent[0].crowns`
4. **Timestamps**: ISO 8601 format, UTC timezone

### Data NOT Available from API

> ⚠️ **Important:** The following metrics are NOT provided by Clash Royale API:

- Global deck meta statistics
- Community-wide win rates per deck
- Card synergy percentages
- Matchup prediction data (calculated/AI-generated instead)

These must be either:
1. Calculated from user's own battle history
2. Generated by AI with clear labeling
3. Omitted if not applicable

---

## Appendix: Component-to-Data Mapping

### Dashboard Components

| Component | Data Category | Data Source |
|-----------|--------------|-------------|
| `DashboardHeader` | Direct API | `player.name`, `player.clan` |
| `OverviewTab` | Mixed | API + Calculated + AI |
| `DeckTab` | Direct API | `player.currentDeck` |
| `MatchesTab` | Direct API | `battles[]` |
| `AnalyticsTab` | Calculated | `deck_usage_stats` |

### Analysis Components

| Component | Data Category | Edge Function |
|-----------|--------------|---------------|
| `DeckAnalysisPanel` | AI-Generated | `analyze-deck` |
| `SynergyMatrix` | AI-Generated | `analyze-deck-advanced` |
| `MatchupPredictions` | AI-Generated | `analyze-deck-advanced` |
| `MatchDetailView` | AI-Generated | `analyze-match` |
| `CoachChatPanel` | AI-Generated | `coach-chat` |

### Tracking Components

| Component | Data Category | Storage Table |
|-----------|--------------|---------------|
| `CardMasteryTracker` | Calculated | `card_mastery` |
| `DeckStatsDashboard` | Calculated | `deck_usage_stats` |
| `CardCollectionTracker` | Direct API | `card_collection` |
| `AchievementDashboard` | Calculated | `user_achievements` |

---

*This document should be updated when data flows change.*
