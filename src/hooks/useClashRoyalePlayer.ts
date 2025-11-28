import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClashRoyalePlayer } from "@/services/clashRoyaleApi";
import { toast } from "@/hooks/use-toast";

async function fetchPlayer(playerTag: string, forceRefresh: boolean = false): Promise<ClashRoyalePlayer> {
  const normalizedTag = playerTag.replace('#', '').toUpperCase();
  
  // Skip local cache check if forcing refresh - let the server handle it
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("player_cache")
      .select("player_data, updated_at")
      .eq("player_tag", normalizedTag)
      .maybeSingle();

    // If cache exists and is fresh (< 5 minutes), return it immediately
    if (cached && cached.player_data) {
      const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
      if (cacheAge < 5 * 60 * 1000) {
        console.log(`Using cached player data (age: ${Math.floor(cacheAge / 1000)}s)`);
        return cached.player_data as unknown as ClashRoyalePlayer;
      }
    }
  }

  // Fetch from API with forceRefresh flag
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clash-royale-api`);
  url.searchParams.set('endpoint', 'player');
  url.searchParams.set('playerTag', playerTag);
  if (forceRefresh) {
    url.searchParams.set('forceRefresh', 'true');
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) {
    // Try stale cache as fallback
    const { data: cached } = await supabase
      .from("player_cache")
      .select("player_data")
      .eq("player_tag", normalizedTag)
      .maybeSingle();
      
    if (cached?.player_data) {
      console.warn('API failed, using stale cache');
      toast({
        title: "Using cached data",
        description: "API unavailable - showing previously saved player profile",
        variant: "default",
      });
      return cached.player_data as unknown as ClashRoyalePlayer;
    }
    throw new Error(`Failed to fetch player data: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Check if this was a fresh API fetch (not cached on server)
  const cacheHit = response.headers.get('X-Cache-Hit') === 'true';
  if (!cacheHit || forceRefresh) {
    toast({
      title: "Player data updated",
      description: `Fresh profile data loaded for ${data.name || normalizedTag}`,
    });
  }

  return data;
}

export function useClashRoyalePlayer(playerTag: string | null) {
  const queryClient = useQueryClient();
  
  const query = useQuery<ClashRoyalePlayer>({
    queryKey: ['clash-player', playerTag],
    queryFn: () => fetchPlayer(playerTag!, false),
    enabled: !!playerTag,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: false,
    retry: 1,
  });

  // Force refresh function that bypasses all caches
  const forceRefresh = async () => {
    if (!playerTag) return;
    const freshData = await fetchPlayer(playerTag, true);
    queryClient.setQueryData(['clash-player', playerTag], freshData);
    return freshData;
  };

  return {
    ...query,
    forceRefresh,
  };
}
