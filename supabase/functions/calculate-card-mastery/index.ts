import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerTag } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch battle log
    const { data: battles, error: battleError } = await supabase.functions.invoke('clash-royale-api', {
      body: { endpoint: `players/${encodeURIComponent(playerTag)}/battlelog` }
    });

    if (battleError || !battles) {
      throw new Error('Failed to fetch battle log');
    }

    // Aggregate card stats
    const cardStats = new Map<number, any>();
    
    for (const battle of battles) {
      if (!battle.team || !battle.team[0] || !battle.team[0].cards) continue;
      
      const isWin = battle.team[0].crowns > (battle.opponent?.[0]?.crowns || 0);
      const crowns = battle.team[0].crowns || 0;
      const deckCards = battle.team[0].cards.map((c: any) => c.name);
      
      for (const card of battle.team[0].cards) {
        if (!cardStats.has(card.id)) {
          cardStats.set(card.id, {
            card_id: card.id,
            card_name: card.name,
            times_used: 0,
            battles_won: 0,
            battles_lost: 0,
            total_crowns: 0,
            partner_cards: new Map<string, number>(),
            opponent_cards: new Map<string, number>(),
          });
        }
        
        const stats = cardStats.get(card.id);
        stats.times_used++;
        stats.total_crowns += crowns;
        
        if (isWin) {
          stats.battles_won++;
          // Track partner cards on wins
          deckCards.forEach((partnerName: string) => {
            if (partnerName !== card.name) {
              stats.partner_cards.set(partnerName, (stats.partner_cards.get(partnerName) || 0) + 1);
            }
          });
        } else {
          stats.battles_lost++;
          // Track opponent cards on losses
          battle.opponent?.[0]?.cards?.forEach((oppCard: any) => {
            stats.opponent_cards.set(oppCard.name, (stats.opponent_cards.get(oppCard.name) || 0) + 1);
          });
        }
      }
    }

    // Calculate mastery levels and prepare upserts
    const upsertPromises = Array.from(cardStats.values()).map(stats => {
      const winRate = stats.battles_won / (stats.battles_won + stats.battles_lost);
      const crownAvg = stats.total_crowns / stats.times_used;
      
      // Mastery calculation: usage (40%) + win rate (35%) + crowns (25%)
      const usageScore = Math.min(stats.times_used / 500, 1) * 40;
      const winScore = winRate * 35;
      const crownScore = (crownAvg / 3) * 25;
      const totalScore = usageScore + winScore + crownScore;
      
      const masteryLevel = Math.max(1, Math.min(10, Math.ceil(totalScore / 10)));
      const masteryProgress = Math.round((totalScore % 10) * 10);
      
      // Get top 3 partner cards
      const bestPartners = (Array.from(stats.partner_cards.entries()) as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      
      // Get top 3 opponent cards on losses
      const worstMatchups = (Array.from(stats.opponent_cards.entries()) as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      return supabase.from('card_mastery').upsert({
        user_id: user.id,
        player_tag: playerTag,
        card_id: stats.card_id,
        card_name: stats.card_name,
        times_used: stats.times_used,
        battles_won: stats.battles_won,
        battles_lost: stats.battles_lost,
        total_crowns: stats.total_crowns,
        best_partner_cards: bestPartners,
        worst_matchup_cards: worstMatchups,
        mastery_level: masteryLevel,
        mastery_progress: masteryProgress,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id,card_id'
      });
    });

    await Promise.all(upsertPromises);

    return new Response(JSON.stringify({ 
      success: true, 
      cards_processed: cardStats.size 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-card-mastery:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});