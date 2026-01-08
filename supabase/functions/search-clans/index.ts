import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const CLASH_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    if (!CLASH_API_KEY) {
      throw new Error('CLASH_ROYALE_API_KEY not configured');
    }

    const { query, type } = await req.json();
    
    // Handle global rankings request
    if (type === 'global_rankings') {
      logger.info('Fetching global clan rankings');
      const response = await fetch(
        'https://proxy.royaleapi.dev/v1/locations/global/rankings/clans?limit=50',
        {
          headers: {
            'Authorization': `Bearer ${CLASH_API_KEY}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const clans = (data.items || []).map((clan: any, index: number) => ({
        rank: index + 1,
        clan_tag: clan.tag,
        name: clan.name,
        badge_id: clan.badgeId,
        location: clan.location?.name || 'Global',
        member_count: clan.members || 0,
        clan_score: clan.clanScore || 0,
        clan_war_trophies: clan.clanWarTrophies || 0,
      }));

      return jsonResponse({ clans });
    }
    
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
      logger.warn('API search failed', { error: apiError instanceof Error ? apiError.message : 'Unknown' });
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

    return jsonResponse({ clans });

  } catch (error: any) {
    logger.error('Error in search-clans', { error: error.message });
    return errorResponse(error.message, 500);
  }
});
