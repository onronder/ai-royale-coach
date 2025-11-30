import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Types =============

interface PlayerProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  trophies: number;
  archetypeWinRates: Record<string, { wins: number; losses: number; rate: number }>;
  bestArchetypes: string[];
  weakArchetypes: string[];
  troubleMatchups: string[];
  masteredCards: string[];
  strugglingCards: string[];
  recentWinRate: number;
  totalBattles: number;
}

interface DeckTemplate {
  id: string;
  name: string;
  archetype: string;
  cards: string[];
  avg_elixir: number;
  difficulty: string;
  description: string;
  popularity_score: number;
}

interface CandidateScore {
  deck: DeckTemplate;
  scores: {
    ownership: number;
    skillMatch: number;
    archetypeFit: number;
    counterPotential: number;
    cardMastery: number;
  };
  totalScore: number;
  reason: string;
}

interface Recommendation {
  deckId: string;
  deckName: string;
  cards: string[];
  archetype: string;
  avgElixir: number;
  difficulty: string;
  matchScore: number;
  reason: string;
  aiExplanation?: string;
  recommendationType: string;
}

// ============= Constants =============

const WEIGHTS = {
  ownership: 0.0,      // Hard filter (must be 1.0)
  skillMatch: 0.20,
  archetypeFit: 0.30,
  counterPotential: 0.25,
  cardMastery: 0.25
};

const SKILL_LEVELS = {
  beginner: { max: 4000, difficulties: ['beginner', 'intermediate'] },
  intermediate: { max: 6000, difficulties: ['beginner', 'intermediate', 'advanced'] },
  advanced: { max: Infinity, difficulties: ['beginner', 'intermediate', 'advanced'] }
};

const MIN_BATTLES_FOR_AI = 20;
const CACHE_TTL_HOURS = 24;
const MAX_RECOMMENDATIONS = 3;
const DAILY_AI_LIMIT = 5; // Max AI-enhanced recommendations per day

// ============= AI Usage Check =============
async function checkAIUsageLimit(supabase: any, userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: usage } = await supabase
    .from('user_ai_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  
  if (!usage) return true; // No usage today, allow
  return usage.request_count < DAILY_AI_LIMIT;
}

async function incrementAIUsage(supabase: any, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing } = await supabase
    .from('user_ai_usage')
    .select('id, request_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  
  if (existing) {
    await supabase
      .from('user_ai_usage')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('user_ai_usage')
      .insert({ user_id: userId, date: today, request_count: 1 });
  }
}

// ============= Helper Functions =============

function getSkillLevel(trophies: number): 'beginner' | 'intermediate' | 'advanced' {
  if (trophies < SKILL_LEVELS.beginner.max) return 'beginner';
  if (trophies < SKILL_LEVELS.intermediate.max) return 'intermediate';
  return 'advanced';
}

function calculateOwnershipScore(deckCards: string[], ownedCards: string[]): number {
  const ownedSet = new Set(ownedCards.map(c => c.toLowerCase()));
  const matchCount = deckCards.filter(c => ownedSet.has(c.toLowerCase())).length;
  return matchCount === 8 ? 1.0 : 0;
}

function calculateSkillMatchScore(deckDifficulty: string, playerSkill: string): number {
  const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
  const deckLevel = difficultyOrder.indexOf(deckDifficulty);
  const playerLevel = difficultyOrder.indexOf(playerSkill);
  
  if (deckLevel <= playerLevel) return 1.0;
  if (deckLevel === playerLevel + 1) return 0.6;
  return 0.3;
}

function calculateArchetypeFitScore(
  deckArchetype: string, 
  bestArchetypes: string[], 
  archetypeWinRates: Record<string, { rate: number }>
): number {
  // Check if this archetype is in player's best archetypes
  if (bestArchetypes.includes(deckArchetype)) return 1.0;
  
  // Check win rate with this archetype
  const archetypeData = archetypeWinRates[deckArchetype];
  if (archetypeData) {
    if (archetypeData.rate >= 60) return 0.9;
    if (archetypeData.rate >= 50) return 0.7;
    if (archetypeData.rate >= 40) return 0.5;
  }
  
  // Unknown archetype - neutral score
  return 0.5;
}

function calculateCounterPotentialScore(
  deckArchetype: string,
  troubleMatchups: string[],
  archetypeCounters: Record<string, string[]>
): number {
  if (troubleMatchups.length === 0) return 0.5;
  
  const counters = archetypeCounters[deckArchetype] || [];
  const counterCount = troubleMatchups.filter(t => counters.includes(t)).length;
  
  if (counterCount >= 2) return 1.0;
  if (counterCount === 1) return 0.7;
  return 0.4;
}

function calculateCardMasteryScore(
  deckCards: string[],
  masteredCards: string[],
  strugglingCards: string[]
): number {
  const masteredSet = new Set(masteredCards.map(c => c.toLowerCase()));
  const strugglingSet = new Set(strugglingCards.map(c => c.toLowerCase()));
  
  const masteredCount = deckCards.filter(c => masteredSet.has(c.toLowerCase())).length;
  const strugglingCount = deckCards.filter(c => strugglingSet.has(c.toLowerCase())).length;
  
  // Reward decks with mastered cards, penalize decks with struggling cards
  const masteryBonus = masteredCount * 0.1;
  const strugglePenalty = strugglingCount * 0.15;
  
  return Math.max(0, Math.min(1, 0.5 + masteryBonus - strugglePenalty));
}

function generateReason(candidate: CandidateScore, profile: PlayerProfile): string {
  const reasons: string[] = [];
  
  if (candidate.scores.archetypeFit >= 0.8) {
    reasons.push(`matches your strong ${candidate.deck.archetype} playstyle`);
  }
  
  if (candidate.scores.counterPotential >= 0.7 && profile.troubleMatchups.length > 0) {
    reasons.push(`counters decks you struggle against`);
  }
  
  if (candidate.scores.cardMastery >= 0.7) {
    reasons.push(`uses cards you've mastered`);
  }
  
  if (candidate.scores.skillMatch === 1.0) {
    reasons.push(`difficulty matches your skill level`);
  }
  
  if (reasons.length === 0) {
    reasons.push(`popular ${candidate.deck.archetype} deck with ${candidate.deck.difficulty} difficulty`);
  }
  
  return reasons.slice(0, 2).join(' and ');
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { playerTag, trophies = 5000, forceRefresh = false, language = 'en' } = await req.json();

    if (!playerTag) {
      return new Response(
        JSON.stringify({ error: 'playerTag is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SUBSCRIPTION CHECK: Verify user has active subscription or trial
    const { data: subscriptionData } = await supabase
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('trial_ends_at')
      .eq('id', user.id)
      .single();

    const now = new Date();
    const isTrialActive = userProfile?.trial_ends_at && 
      new Date(userProfile.trial_ends_at) > now;
    const hasAccess = subscriptionData?.status === 'active' || isTrialActive;

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ 
          error: 'Subscription required to use AI features',
          subscription_required: true 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[recommend-deck] Starting for user ${user.id}, player ${playerTag}`);

    // ============= Step 1: Check Cache =============
    if (!forceRefresh) {
      const cacheExpiry = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
      const { data: cachedRecs } = await supabase
        .from('recommendation_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .gte('created_at', cacheExpiry)
        .eq('adopted', false)
        .order('recommendation_score', { ascending: false })
        .limit(MAX_RECOMMENDATIONS);

      if (cachedRecs && cachedRecs.length >= MAX_RECOMMENDATIONS) {
        console.log(`[recommend-deck] Returning ${cachedRecs.length} cached recommendations`);
        return new Response(
          JSON.stringify({
            recommendations: cachedRecs.map(r => ({
              deckId: r.recommended_deck_id,
              deckName: r.deck_name || r.archetype, // Use stored deck_name, fallback to archetype
              cards: r.recommended_cards,
              archetype: r.archetype,
              avgElixir: r.avg_elixir || 0,
              difficulty: r.difficulty || 'intermediate',
              matchScore: r.recommendation_score * 100, // Convert back to percentage
              reason: r.recommendation_reason,
              aiExplanation: r.ai_explanation,
              recommendationType: r.recommendation_type,
              fromCache: true
            })),
            fromCache: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============= Step 2: Build Player Profile =============
    console.log('[recommend-deck] Building player profile...');

    // Get deck usage stats for archetype analysis
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deckStats } = await supabase
      .from('deck_usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag)
      .gte('date', thirtyDaysAgo.split('T')[0]);

    // Get card mastery data
    const { data: cardMastery } = await supabase
      .from('card_mastery')
      .select('card_name, mastery_level, times_used, battles_won, battles_lost')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag);

    // Get card collection
    const { data: cardCollection } = await supabase
      .from('card_collection')
      .select('card_name')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag);

    // Calculate archetype win rates
    const archetypeWinRates: Record<string, { wins: number; losses: number; rate: number }> = {};
    let totalWins = 0;
    let totalLosses = 0;

    (deckStats || []).forEach(stat => {
      const archetype = stat.archetype || 'Unknown';
      if (!archetypeWinRates[archetype]) {
        archetypeWinRates[archetype] = { wins: 0, losses: 0, rate: 0 };
      }
      archetypeWinRates[archetype].wins += stat.battles_won || 0;
      archetypeWinRates[archetype].losses += stat.battles_lost || 0;
      totalWins += stat.battles_won || 0;
      totalLosses += stat.battles_lost || 0;
    });

    // Calculate win rates
    Object.keys(archetypeWinRates).forEach(arch => {
      const data = archetypeWinRates[arch];
      const total = data.wins + data.losses;
      data.rate = total > 0 ? (data.wins / total) * 100 : 0;
    });

    // Sort archetypes by win rate
    const sortedArchetypes = Object.entries(archetypeWinRates)
      .filter(([_, data]) => (data.wins + data.losses) >= 5)
      .sort((a, b) => b[1].rate - a[1].rate);

    // Identify mastered and struggling cards
    const masteredCards = (cardMastery || [])
      .filter(cm => cm.mastery_level >= 7)
      .map(cm => cm.card_name);
    
    const strugglingCards = (cardMastery || [])
      .filter(cm => cm.mastery_level <= 3 && cm.times_used >= 20)
      .map(cm => cm.card_name);

    // Build player profile
    const profile: PlayerProfile = {
      skillLevel: getSkillLevel(trophies),
      trophies,
      archetypeWinRates,
      bestArchetypes: sortedArchetypes.slice(0, 3).map(([arch]) => arch),
      weakArchetypes: sortedArchetypes.slice(-3).map(([arch]) => arch),
      troubleMatchups: [], // Will be populated from opponent_archetype tracking
      masteredCards,
      strugglingCards,
      recentWinRate: totalWins + totalLosses > 0 
        ? (totalWins / (totalWins + totalLosses)) * 100 
        : 50,
      totalBattles: totalWins + totalLosses
    };

    // Extract trouble matchups from deck stats
    (deckStats || []).forEach(stat => {
      const lossesBy = stat.losses_by_opponent_archetype as Record<string, number> || {};
      const winsBy = stat.wins_by_opponent_archetype as Record<string, number> || {};
      
      Object.entries(lossesBy).forEach(([arch, losses]) => {
        const wins = winsBy[arch] || 0;
        const total = wins + losses;
        if (total >= 3 && (wins / total) < 0.4 && !profile.troubleMatchups.includes(arch)) {
          profile.troubleMatchups.push(arch);
        }
      });
    });

    console.log('[recommend-deck] Profile built:', {
      skillLevel: profile.skillLevel,
      bestArchetypes: profile.bestArchetypes,
      totalBattles: profile.totalBattles,
      recentWinRate: profile.recentWinRate.toFixed(1)
    });

    // ============= Step 3: Get Candidate Decks =============
    console.log('[recommend-deck] Fetching candidate decks...');

    const { data: deckTemplates } = await supabase
      .from('deck_templates')
      .select('*')
      .order('popularity_score', { ascending: false });

    if (!deckTemplates || deckTemplates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No deck templates available', recommendations: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get archetype counter relationships
    const { data: archetypes } = await supabase
      .from('deck_archetypes')
      .select('name, counters, countered_by');

    const archetypeCounters: Record<string, string[]> = {};
    (archetypes || []).forEach(arch => {
      archetypeCounters[arch.name] = arch.counters || [];
    });

    const ownedCards = (cardCollection || []).map(c => c.card_name);

    // ============= Step 4: Score Candidates =============
    console.log('[recommend-deck] Scoring candidates...');

    const candidates: CandidateScore[] = [];

    for (const deck of deckTemplates) {
      const cards = Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]');
      
      const scores = {
        ownership: calculateOwnershipScore(cards, ownedCards),
        skillMatch: calculateSkillMatchScore(deck.difficulty || 'intermediate', profile.skillLevel),
        archetypeFit: calculateArchetypeFitScore(deck.archetype, profile.bestArchetypes, archetypeWinRates),
        counterPotential: calculateCounterPotentialScore(deck.archetype, profile.troubleMatchups, archetypeCounters),
        cardMastery: calculateCardMasteryScore(cards, masteredCards, strugglingCards)
      };

      // Skip decks player doesn't own
      if (scores.ownership < 1.0) continue;

      // Check skill-appropriate difficulty
      const allowedDifficulties = SKILL_LEVELS[profile.skillLevel].difficulties;
      if (!allowedDifficulties.includes(deck.difficulty || 'intermediate')) {
        scores.skillMatch *= 0.5;
      }

      const totalScore = 
        scores.skillMatch * WEIGHTS.skillMatch +
        scores.archetypeFit * WEIGHTS.archetypeFit +
        scores.counterPotential * WEIGHTS.counterPotential +
        scores.cardMastery * WEIGHTS.cardMastery;

      candidates.push({
        deck: { ...deck, cards },
        scores,
        totalScore,
        reason: ''
      });
    }

    // Sort by total score
    candidates.sort((a, b) => b.totalScore - a.totalScore);
    
    // Generate reasons for top candidates
    candidates.slice(0, 5).forEach(c => {
      c.reason = generateReason(c, profile);
    });

    console.log(`[recommend-deck] Found ${candidates.length} valid candidates`);

    // ============= Step 5: AI Enhancement (Optional) =============
    let topCandidates = candidates.slice(0, 5);
    let aiEnhanced = false;

    // Check AI usage limit before making AI call
    const canUseAI = await checkAIUsageLimit(supabase, user.id);
    
    if (profile.totalBattles >= MIN_BATTLES_FOR_AI && topCandidates.length > 0 && canUseAI) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (LOVABLE_API_KEY) {
        // Increment AI usage counter
        await incrementAIUsage(supabase, user.id);
        console.log('[recommend-deck] Enhancing with AI...');
        
        const languageInstructions: Record<string, string> = {
          en: 'Respond in English.',
          es: 'Responde en español.',
          pt: 'Responda em português.',
          tr: 'Türkçe yanıt ver.',
          fr: 'Réponds en français.',
        };
        const languageInstruction = languageInstructions[language] || languageInstructions.en;

        const prompt = `You are an expert Clash Royale coach recommending decks to a player. ${languageInstruction}

## Player Profile
- Trophy Range: ${profile.trophies} (${profile.skillLevel} skill level)
- Best Archetypes: ${profile.bestArchetypes.join(', ') || 'Unknown'}
- Struggling Against: ${profile.troubleMatchups.join(', ') || 'None identified'}
- Mastered Cards: ${profile.masteredCards.slice(0, 5).join(', ') || 'None yet'}
- Recent Win Rate: ${profile.recentWinRate.toFixed(1)}%
- Total Battles Analyzed: ${profile.totalBattles}

## Candidate Decks to Rank
${topCandidates.map((c, i) => `
${i + 1}. ${c.deck.name} (${c.deck.archetype}, ${c.deck.difficulty})
   Cards: ${c.deck.cards.join(', ')}
   Avg Elixir: ${c.deck.avg_elixir}
   Rule Score: ${(c.totalScore * 100).toFixed(0)}%
   Initial Reason: ${c.reason}
`).join('\n')}

Rank these decks for this player and provide personalized explanations. Consider their strengths, weaknesses, and what they struggle against. Focus on why each deck fits or doesn't fit their playstyle.`;

        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: prompt }],
              tools: [{
                type: 'function',
                function: {
                  name: 'rank_deck_recommendations',
                  description: 'Rank and explain deck recommendations for a player',
                  parameters: {
                    type: 'object',
                    properties: {
                      rankings: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            deckIndex: { type: 'number', description: '1-based index from candidate list' },
                            explanation: { type: 'string', description: 'Personalized explanation why this deck fits' },
                            fitScore: { type: 'number', description: 'AI-adjusted fit score 0-100' }
                          },
                          required: ['deckIndex', 'explanation', 'fitScore']
                        }
                      }
                    },
                    required: ['rankings'],
                    additionalProperties: false
                  }
                }
              }],
              tool_choice: { type: 'function', function: { name: 'rank_deck_recommendations' } }
            }),
          });

          if (aiResponse.ok) {
            const result = await aiResponse.json();
            const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
            
            if (toolCall) {
              const aiData = JSON.parse(toolCall.function.arguments);
              
              // Reorder and enhance candidates based on AI
              const enhancedCandidates: typeof topCandidates = [];
              (aiData.rankings || []).forEach((ranking: { deckIndex: number; explanation: string; fitScore: number }) => {
                const idx = ranking.deckIndex - 1;
                if (idx >= 0 && idx < topCandidates.length) {
                  const candidate = topCandidates[idx];
                  candidate.totalScore = ranking.fitScore / 100;
                  enhancedCandidates.push({
                    ...candidate,
                    reason: candidate.reason,
                  });
                  // Store AI explanation separately
                  (candidate as any).aiExplanation = ranking.explanation;
                }
              });
              
              if (enhancedCandidates.length > 0) {
                topCandidates = enhancedCandidates;
                aiEnhanced = true;
                console.log('[recommend-deck] AI enhancement successful');
              }
            }
          } else {
            console.warn('[recommend-deck] AI call failed, using rule-based results');
          }
        } catch (aiError) {
          console.error('[recommend-deck] AI error:', aiError);
        }
      }
    }

    // ============= Step 6: Store & Return Recommendations =============
    const recommendations: Recommendation[] = topCandidates.slice(0, MAX_RECOMMENDATIONS).map(c => ({
      deckId: c.deck.id,
      deckName: c.deck.name,
      cards: c.deck.cards,
      archetype: c.deck.archetype,
      avgElixir: c.deck.avg_elixir,
      difficulty: c.deck.difficulty,
      matchScore: Math.round(c.totalScore * 100),
      reason: c.reason,
      aiExplanation: (c as any).aiExplanation,
      recommendationType: c.scores.counterPotential >= 0.8 ? 'counter' : 
                          c.scores.archetypeFit >= 0.8 ? 'strength' : 'standard'
    }));

    // Store recommendations in history (including new deck_name, avg_elixir, difficulty fields)
    const insertPromises = recommendations.map(rec => 
      supabase.from('recommendation_history').insert({
        user_id: user.id,
        player_tag: playerTag,
        recommended_deck_id: rec.deckId,
        recommended_cards: rec.cards,
        recommendation_reason: rec.reason,
        recommendation_score: rec.matchScore / 100,
        ai_explanation: rec.aiExplanation,
        archetype: rec.archetype,
        recommendation_type: rec.recommendationType,
        win_rate_before: profile.recentWinRate,
        deck_name: rec.deckName,
        avg_elixir: rec.avgElixir,
        difficulty: rec.difficulty
      })
    );

    await Promise.all(insertPromises);

    console.log(`[recommend-deck] Returning ${recommendations.length} recommendations (AI enhanced: ${aiEnhanced})`);

    return new Response(
      JSON.stringify({
        recommendations,
        profile: {
          skillLevel: profile.skillLevel,
          bestArchetypes: profile.bestArchetypes,
          recentWinRate: profile.recentWinRate,
          totalBattles: profile.totalBattles
        },
        aiEnhanced,
        fromCache: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[recommend-deck] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
