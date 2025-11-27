import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLASH_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!CLASH_API_KEY) {
      throw new Error('CLASH_ROYALE_API_KEY not configured');
    }

    const { query } = await req.json();
    
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let clans: any[] = [];

    // Try API search
    try {
      let apiUrl: string;
      
      if (query.startsWith('#')) {
        // Search by tag
        const tag = encodeURIComponent(query);
        apiUrl = `https://proxy.royaleapi.dev/v1/clans/${tag}`;
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${CLASH_API_KEY}`,
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const clanData = await response.json();
          clans = [clanData];
        }
      } else {
        // Search by name
        const encodedQuery = encodeURIComponent(query);
        apiUrl = `https://proxy.royaleapi.dev/v1/clans?name=${encodedQuery}&limit=20`;
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${CLASH_API_KEY}`,
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          clans = data.items || [];
        }
      }

      // Cache found clans in database
      if (clans.length > 0) {
        const clanInserts = clans.map(clan => ({
          clan_tag: clan.tag,
          name: clan.name,
          description: clan.description || null,
          type: clan.type || null,
          required_trophies: clan.requiredTrophies || 0,
          member_count: clan.members || 0,
          war_trophies: clan.clanWarTrophies || 0,
          location: clan.location?.name || null,
          badge_id: clan.badgeId || null,
          leader_name: clan.leaderName || null,
          leader_tag: clan.leaderTag || null,
        }));

        await supabase
          .from('clans')
          .upsert(clanInserts, { onConflict: 'clan_tag' });
      }

    } catch (apiError) {
      console.error('API search failed:', apiError);
      // Fallback to database search
    }

    // If API returned no results, try database
    if (clans.length === 0) {
      const dbQuery = query.startsWith('#') 
        ? supabase.from('clans').select('*').eq('clan_tag', query)
        : supabase.from('clans').select('*').ilike('name', `%${query}%`);

      const { data, error } = await dbQuery.order('war_trophies', { ascending: false }).limit(20);
      
      if (!error && data) {
        clans = data.map(clan => ({
          id: clan.id,
          clan_tag: clan.clan_tag,
          name: clan.name,
          description: clan.description,
          type: clan.type,
          required_trophies: clan.required_trophies,
          member_count: clan.member_count,
          war_trophies: clan.war_trophies,
          location: clan.location,
        }));
      }
    } else {
      // Format API results to match frontend expectations
      clans = clans.map(clan => ({
        clan_tag: clan.tag,
        name: clan.name,
        description: clan.description || null,
        type: clan.type || null,
        required_trophies: clan.requiredTrophies || 0,
        member_count: clan.members || 0,
        war_trophies: clan.clanWarTrophies || 0,
        location: clan.location?.name || null,
      }));
    }

    return new Response(
      JSON.stringify({ clans }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in search-clans:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});