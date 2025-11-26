import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkillLevels {
  cardPlacement: number;
  timing: number;
  elixirManagement: number;
  prediction: number;
  adaptation: number;
}

interface AchievementCriteria {
  type: 'skill_level' | 'card_mastery_count' | 'learning_phase' | 'achievement_count';
  skill?: string;
  threshold?: number;
  level?: number;
  count?: number;
  phase?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { playerTag } = await req.json();
    if (!playerTag) {
      throw new Error('Missing playerTag');
    }

    console.log(`Syncing achievements for user ${user.id}, player ${playerTag}`);

    // Step 1: Calculate skill levels from card_mastery data
    const { data: masteryData, error: masteryError } = await supabaseClient
      .from('card_mastery')
      .select('*')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag);

    if (masteryError) {
      console.error('Error fetching mastery data:', masteryError);
      throw masteryError;
    }

    console.log(`Found ${masteryData?.length || 0} mastery records`);

    // Calculate skill levels based on card mastery data
    const skillLevels: SkillLevels = {
      cardPlacement: 0,
      timing: 0,
      elixirManagement: 0,
      prediction: 0,
      adaptation: 0,
    };

    if (masteryData && masteryData.length > 0) {
      // Calculate average mastery level across all cards
      const avgMastery = masteryData.reduce((sum, card) => sum + (card.mastery_level || 0), 0) / masteryData.length;
      
      // Calculate win rate
      const totalBattles = masteryData.reduce((sum, card) => sum + (card.battles_won || 0) + (card.battles_lost || 0), 0);
      const winRate = totalBattles > 0 
        ? masteryData.reduce((sum, card) => sum + (card.battles_won || 0), 0) / totalBattles 
        : 0;

      // Calculate total usage
      const totalUsage = masteryData.reduce((sum, card) => sum + (card.times_used || 0), 0);

      // Map metrics to skill levels (1-10 scale)
      skillLevels.cardPlacement = Math.min(10, Math.round(avgMastery * 1.2)); // Mastery correlates with placement
      skillLevels.timing = Math.min(10, Math.round(winRate * 12)); // Win rate shows timing skill
      skillLevels.elixirManagement = Math.min(10, Math.round((masteryData.filter(c => (c.avg_elixir_decks || 0) <= 3.5).length / Math.max(1, masteryData.length)) * 10));
      skillLevels.prediction = Math.min(10, Math.round(avgMastery * 1.1)); // Related to mastery
      skillLevels.adaptation = Math.min(10, Math.round((totalUsage / Math.max(1, masteryData.length)) / 10)); // Usage diversity
    }

    console.log('Calculated skill levels:', skillLevels);

    // Determine learning phase based on skill levels
    const avgSkillLevel = Object.values(skillLevels).reduce((a, b) => a + b, 0) / 5;
    let learningPhase = 'beginner';
    if (avgSkillLevel >= 8) learningPhase = 'master';
    else if (avgSkillLevel >= 6) learningPhase = 'advanced';
    else if (avgSkillLevel >= 4) learningPhase = 'intermediate';

    // Count high-mastery cards
    const masterCards = masteryData?.filter(c => (c.mastery_level || 0) >= 9).length || 0;
    const legendCards = masteryData?.filter(c => (c.mastery_level || 0) >= 10).length || 0;

    // Step 2: Update or insert achievement progress
    const { error: progressError } = await supabaseClient
      .from('achievement_progress')
      .upsert({
        user_id: user.id,
        player_tag: playerTag,
        skill_levels: skillLevels,
        learning_phase: learningPhase,
        total_mastery_points: 0, // Will be calculated after unlocking achievements
        achievements_unlocked: 0, // Will be updated after checking achievements
      }, {
        onConflict: 'user_id,player_tag',
      });

    if (progressError) {
      console.error('Error updating progress:', progressError);
      throw progressError;
    }

    // Step 3: Fetch all achievements
    const { data: achievements, error: achievementsError } = await supabaseClient
      .from('achievements')
      .select('*');

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError);
      throw achievementsError;
    }

    console.log(`Checking ${achievements?.length || 0} achievements`);

    // Step 4: Check and unlock achievements
    const newlyUnlocked: string[] = [];
    const progressUpdates: any[] = [];

    for (const achievement of achievements || []) {
      const criteria = achievement.criteria as AchievementCriteria;
      let isUnlocked = false;
      let progress = 0;

      // Check skill level achievements
      if (criteria.type === 'skill_level' && criteria.skill && criteria.threshold) {
        const skillValue = skillLevels[criteria.skill as keyof SkillLevels] || 0;
        progress = Math.min(100, (skillValue / criteria.threshold) * 100);
        isUnlocked = skillValue >= criteria.threshold;
      }
      // Check card mastery count achievements
      else if (criteria.type === 'card_mastery_count' && criteria.level && criteria.count) {
        const cardCount = criteria.level === 10 ? legendCards : masterCards;
        progress = Math.min(100, (cardCount / criteria.count) * 100);
        isUnlocked = cardCount >= criteria.count;
      }
      // Check learning phase achievements
      else if (criteria.type === 'learning_phase' && criteria.phase) {
        const phases = ['beginner', 'intermediate', 'advanced', 'master'];
        const currentIndex = phases.indexOf(learningPhase);
        const requiredIndex = phases.indexOf(criteria.phase);
        progress = currentIndex >= requiredIndex ? 100 : (currentIndex / requiredIndex) * 100;
        isUnlocked = currentIndex >= requiredIndex;
      }

      // Fetch or create user achievement record
      const { data: existingAchievement } = await supabaseClient
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('achievement_id', achievement.id)
        .eq('player_tag', playerTag)
        .maybeSingle();

      if (!existingAchievement) {
        // Create new achievement record
        const { error: insertError } = await supabaseClient
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
            player_tag: playerTag,
            progress: Math.round(progress),
            unlocked_at: isUnlocked ? new Date().toISOString() : null,
          });

        if (insertError) {
          console.error('Error inserting achievement:', insertError);
        } else if (isUnlocked) {
          newlyUnlocked.push(achievement.name);
        }
      } else if (isUnlocked && !existingAchievement.unlocked_at) {
        // Unlock previously locked achievement
        const { error: updateError } = await supabaseClient
          .from('user_achievements')
          .update({
            progress: 100,
            unlocked_at: new Date().toISOString(),
          })
          .eq('id', existingAchievement.id);

        if (updateError) {
          console.error('Error unlocking achievement:', updateError);
        } else {
          newlyUnlocked.push(achievement.name);
        }
      } else if (!isUnlocked) {
        // Update progress
        const { error: updateError } = await supabaseClient
          .from('user_achievements')
          .update({
            progress: Math.round(progress),
          })
          .eq('id', existingAchievement.id);

        if (updateError) {
          console.error('Error updating progress:', updateError);
        }
      }
    }

    // Step 5: Check milestone achievements (based on total achievements unlocked)
    const { data: unlockedAchievements } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag)
      .not('unlocked_at', 'is', null);

    const totalUnlocked = unlockedAchievements?.length || 0;

    // Check achievement count milestones
    for (const achievement of achievements || []) {
      const criteria = achievement.criteria as AchievementCriteria;
      if (criteria.type === 'achievement_count' && criteria.count) {
        const progress = Math.min(100, (totalUnlocked / criteria.count) * 100);
        const isUnlocked = totalUnlocked >= criteria.count;

        const { data: existingMilestone } = await supabaseClient
          .from('user_achievements')
          .select('*')
          .eq('user_id', user.id)
          .eq('achievement_id', achievement.id)
          .eq('player_tag', playerTag)
          .maybeSingle();

        if (!existingMilestone && totalUnlocked > 0) {
          await supabaseClient
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievement.id,
              player_tag: playerTag,
              progress: Math.round(progress),
              unlocked_at: isUnlocked ? new Date().toISOString() : null,
            });

          if (isUnlocked) {
            newlyUnlocked.push(achievement.name);
          }
        } else if (existingMilestone && isUnlocked && !existingMilestone.unlocked_at) {
          await supabaseClient
            .from('user_achievements')
            .update({
              progress: 100,
              unlocked_at: new Date().toISOString(),
            })
            .eq('id', existingMilestone.id);

          newlyUnlocked.push(achievement.name);
        } else if (existingMilestone && !isUnlocked) {
          await supabaseClient
            .from('user_achievements')
            .update({
              progress: Math.round(progress),
            })
            .eq('id', existingMilestone.id);
        }
      }
    }

    // Step 6: Calculate total mastery points
    const { data: userAchievementsData } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id, achievements!inner(points)')
      .eq('user_id', user.id)
      .eq('player_tag', playerTag)
      .not('unlocked_at', 'is', null);

    const totalPoints = userAchievementsData?.reduce((sum: number, ua: any) => {
      return sum + (ua.achievements?.points || 0);
    }, 0) || 0;

    // Update achievement progress with final counts
    await supabaseClient
      .from('achievement_progress')
      .update({
        total_mastery_points: totalPoints,
        achievements_unlocked: totalUnlocked,
      })
      .eq('user_id', user.id)
      .eq('player_tag', playerTag);

    console.log(`Sync complete. ${newlyUnlocked.length} newly unlocked achievements`);

    return new Response(
      JSON.stringify({
        success: true,
        newlyUnlocked,
        totalUnlocked,
        totalPoints,
        skillLevels,
        learningPhase,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing achievements:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
