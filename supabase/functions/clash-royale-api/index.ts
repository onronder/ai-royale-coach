import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLASH_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limit settings
const MAX_REQUESTS_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

// Cache TTLs (in seconds)
const CACHE_TTL = {
  player: 300, // 5 minutes
  battles: 120, // 2 minutes
};

interface ClashApiError {
  reason: string;
  message: string;
}

/**
 * Check rate limit using database-backed storage (persists across edge function instances)
 */
async function checkRateLimitDb(supabase: any, identifier: string): Promise<{ allowed: boolean; resetIn?: number }> {
  try {
    // Use database function for atomic rate limit check
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_max_requests: MAX_REQUESTS_PER_MINUTE,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request but log the issue
      return { allowed: true };
    }

    if (!data) {
      return { allowed: false, resetIn: RATE_LIMIT_WINDOW_SECONDS };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit exception:', error);
    // On exception, allow the request
    return { allowed: true };
  }
}

function normalizePlayerTag(tag: string): string {
  return tag.replace(/^#/, '').toUpperCase();
}

function encodePlayerTag(tag: string): string {
  return encodeURIComponent(`#${normalizePlayerTag(tag)}`);
}

async function fetchFromClashApi(endpoint: string): Promise<any> {
  console.log(`Fetching from Clash Royale API: ${endpoint}`);
  
  const response = await fetch(`https://proxy.royaleapi.dev/v1${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${CLASH_API_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData: ClashApiError = await response.json().catch(() => ({
      reason: 'unknown',
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    
    console.error('Clash API error:', errorData);
    throw new Error(errorData.message || `Clash API returned status ${response.status}`);
  }

  return await response.json();
}

async function getCachedOrFetch(
  supabase: any,
  playerTag: string,
  type: 'player' | 'battles',
  fetchFn: () => Promise<any>,
  forceRefresh: boolean = false
): Promise<{ data: any; cacheHit: boolean; stale: boolean }> {
  const normalizedTag = normalizePlayerTag(playerTag);
  const now = new Date();
  const cacheTTL = CACHE_TTL[type];

  // Try to get from player_cache table
  const { data: cached, error: cacheError } = await supabase
    .from('player_cache')
    .select('*')
    .eq('player_tag', normalizedTag)
    .maybeSingle();

  let cachedData = null;
  let staleCache = false;

  if (cached && !cacheError && !forceRefresh) {
    const cacheAge = (now.getTime() - new Date(cached.updated_at).getTime()) / 1000;
    cachedData = type === 'player' ? cached.player_data : cached.battles_data;
    
    if (cachedData && cacheAge < cacheTTL) {
      console.log(`Cache hit for ${type} (age: ${cacheAge.toFixed(1)}s)`);
      return { data: cachedData, cacheHit: true, stale: false };
    }
    
    staleCache = cacheAge >= cacheTTL && cachedData;
  } else if (forceRefresh) {
    console.log(`Force refresh requested for ${type}, bypassing cache`);
    if (cached && !cacheError) {
      cachedData = type === 'player' ? cached.player_data : cached.battles_data;
      staleCache = !!cachedData;
    }
  }

  // Fetch fresh data
  console.log(`Cache miss for ${type}, fetching fresh data`);
  
  try {
    const freshData = await fetchFn();

    // Get existing cache to preserve other data
    const { data: existingCache } = await supabase
      .from('player_cache')
      .select('player_data, battles_data')
      .eq('player_tag', normalizedTag)
      .maybeSingle();

    // Build cache update preserving existing data
    const cacheUpdate: any = {
      player_tag: normalizedTag,
      player_data: type === 'player' ? freshData : (existingCache?.player_data || null),
      battles_data: type === 'battles' ? freshData : (existingCache?.battles_data || null),
      updated_at: now.toISOString(),
      cached_at: now.toISOString(),
    };

    console.log(`Attempting to cache ${type} data for tag: ${normalizedTag}`);
    
    const { data: cacheResult, error: upsertError } = await supabase
      .from('player_cache')
      .upsert(cacheUpdate, { onConflict: 'player_tag' })
      .select();
    
    if (upsertError) {
      console.error(`Failed to cache ${type} data for ${normalizedTag}:`, {
        error: upsertError,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details
      });
    } else {
      console.log(`Successfully cached ${type} data for ${normalizedTag}:`, {
        recordsAffected: cacheResult?.length || 0,
        playerTag: normalizedTag,
        hasPlayerData: !!cacheUpdate.player_data,
        hasBattlesData: !!cacheUpdate.battles_data
      });
    }

    return { data: freshData, cacheHit: false, stale: false };
  } catch (error) {
    if (staleCache && cachedData) {
      console.warn(`API failed, returning stale cache for ${type}`);
      return { data: cachedData, cacheHit: true, stale: true };
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client early for rate limiting
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!CLASH_API_KEY) {
      throw new Error('CLASH_ROYALE_API_KEY not configured');
    }

    // Database-backed rate limiting (persists across instances)
    const identifier = req.headers.get('x-forwarded-for') || req.headers.get('authorization') || 'anonymous';
    const rateCheck = await checkRateLimitDb(supabase, identifier);
    
    if (!rateCheck.allowed) {
      console.warn(`Rate limit exceeded for ${identifier}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: `Too many requests. Please retry in ${rateCheck.resetIn || 60} seconds.`,
          retryAfter: rateCheck.resetIn || 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': (rateCheck.resetIn || 60).toString()
          } 
        }
      );
    }

    // Support both query params AND POST body for backward compatibility
    let endpoint: string | null = null;
    let playerTag: string | null = null;
    let forceRefresh = false;

    const url = new URL(req.url);
    
    endpoint = url.searchParams.get('endpoint');
    playerTag = url.searchParams.get('playerTag');
    forceRefresh = url.searchParams.get('forceRefresh') === 'true';

    if (!endpoint && req.method === 'POST') {
      try {
        const body = await req.json();
        endpoint = body.endpoint;
        playerTag = body.playerTag;
        forceRefresh = body.forceRefresh === true;
        console.log('Using POST body params:', { endpoint, playerTag, forceRefresh });
      } catch (e) {
        console.log('No JSON body or parse error:', e);
      }
    }

    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }

    let result;

    switch (endpoint) {
      case 'player': {
        if (!playerTag) {
          throw new Error('Missing playerTag parameter');
        }
        const normalizedTag = normalizePlayerTag(playerTag);
        result = await getCachedOrFetch(
          supabase,
          normalizedTag,
          'player',
          () => fetchFromClashApi(`/players/${encodePlayerTag(normalizedTag)}`),
          forceRefresh
        );
        break;
      }

      case 'battles': {
        if (!playerTag) {
          throw new Error('Missing playerTag parameter');
        }
        const normalizedTag = normalizePlayerTag(playerTag);
        result = await getCachedOrFetch(
          supabase,
          normalizedTag,
          'battles',
          () => fetchFromClashApi(`/players/${encodePlayerTag(normalizedTag)}/battlelog`),
          forceRefresh
        );
        break;
      }

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache-Hit': result.cacheHit.toString(),
        'X-Cache-Stale': result.stale.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error in clash-royale-api function:', error);
    
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Rate limit') ? 429 :
                      error.message.includes('Missing') ? 400 : 500;

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
