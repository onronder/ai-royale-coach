import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLASH_API_KEY = Deno.env.get('CLASH_ROYALE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limiting: Track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

// Cache TTLs (in seconds)
const CACHE_TTL = {
  player: 300, // 5 minutes
  battles: 120, // 2 minutes
};

interface ClashApiError {
  reason: string;
  message: string;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  limit.count++;
  return true;
}

function normalizePlayerTag(tag: string): string {
  // Remove # if present and ensure uppercase
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
  fetchFn: () => Promise<any>
): Promise<any> {
  const normalizedTag = normalizePlayerTag(playerTag);
  const now = new Date();
  const cacheTTL = CACHE_TTL[type];

  // Try to get from player_cache table
  const { data: cached, error: cacheError } = await supabase
    .from('player_cache')
    .select('*')
    .eq('player_tag', normalizedTag)
    .maybeSingle();

  if (cached && !cacheError) {
    const cacheAge = (now.getTime() - new Date(cached.updated_at).getTime()) / 1000;
    const cachedData = type === 'player' ? cached.player_data : cached.battles_data;
    
    if (cachedData && cacheAge < cacheTTL) {
      console.log(`Cache hit for ${type} (age: ${cacheAge.toFixed(1)}s)`);
      return cachedData;
    }
  }

  // Fetch fresh data
  console.log(`Cache miss for ${type}, fetching fresh data`);
  const freshData = await fetchFn();

  // Update player_cache table
  const cacheUpdate: any = {
    player_tag: normalizedTag,
    updated_at: now.toISOString(),
  };

  if (type === 'player') {
    cacheUpdate.player_data = freshData;
  } else {
    cacheUpdate.battles_data = freshData;
  }

  // Upsert to cache (fire and forget)
  supabase
    .from('player_cache')
    .upsert(cacheUpdate, { onConflict: 'player_tag' })
    .then(({ error }: any) => {
      if (error) console.error('Failed to cache data:', error);
    });

  return freshData;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key exists
    if (!CLASH_API_KEY) {
      throw new Error('CLASH_ROYALE_API_KEY not configured');
    }

    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    const playerTag = url.searchParams.get('playerTag');

    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let data;

    switch (endpoint) {
      case 'player': {
        if (!playerTag) {
          throw new Error('Missing playerTag parameter');
        }
        const normalizedTag = normalizePlayerTag(playerTag);
        data = await getCachedOrFetch(
          supabase,
          normalizedTag,
          'player',
          () => fetchFromClashApi(`/players/${encodePlayerTag(normalizedTag)}`)
        );
        break;
      }

      case 'battles': {
        if (!playerTag) {
          throw new Error('Missing playerTag parameter');
        }
        const normalizedTag = normalizePlayerTag(playerTag);
        data = await getCachedOrFetch(
          supabase,
          normalizedTag,
          'battles',
          () => fetchFromClashApi(`/players/${encodePlayerTag(normalizedTag)}/battlelog`)
        );
        break;
      }

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
