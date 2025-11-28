import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { toast } from "@/hooks/use-toast";

async function fetchBattles(playerTag: string, forceRefresh: boolean = false): Promise<ClashRoyaleBattle[]> {
  const normalizedTag = playerTag.replace('#', '').toUpperCase();
  
  // Skip local cache check if forcing refresh
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from("player_cache")
      .select("battles_data, updated_at")
      .eq("player_tag", normalizedTag)
      .maybeSingle();

    // If cache exists and is fresh (< 2 minutes), return it immediately
    if (cached && cached.battles_data) {
      const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
      if (cacheAge < 2 * 60 * 1000) {
        console.log(`Using cached battles (age: ${Math.floor(cacheAge / 1000)}s)`);
        return cached.battles_data as unknown as ClashRoyaleBattle[];
      }
    }
  }

  // Fetch from API with forceRefresh flag
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clash-royale-api`);
  url.searchParams.set('endpoint', 'battles');
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
      .select("battles_data")
      .eq("player_tag", normalizedTag)
      .maybeSingle();
      
    if (cached?.battles_data) {
      console.warn('API failed, using stale cache');
      toast({
        title: "Using cached data",
        description: "API unavailable - showing previously saved battle history",
        variant: "default",
      });
      return cached.battles_data as unknown as ClashRoyaleBattle[];
    }
    throw new Error(`Failed to fetch battles: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Check if this was a fresh API fetch
  const cacheHit = response.headers.get('X-Cache-Hit') === 'true';
  if ((!cacheHit || forceRefresh) && Array.isArray(data)) {
    toast({
      title: "Battle history updated",
      description: `Loaded ${data.length} recent battles`,
    });
  }

  return data;
}

export function useClashRoyaleBattles(playerTag: string | null) {
  const queryClient = useQueryClient();
  
  const query = useQuery<ClashRoyaleBattle[]>({
    queryKey: ['clash-battles', playerTag],
    queryFn: () => fetchBattles(playerTag!, false),
    enabled: !!playerTag,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: false,
    retry: 1,
  });

  // Force refresh function that bypasses all caches
  const forceRefresh = async () => {
    if (!playerTag) return;
    const freshData = await fetchBattles(playerTag, true);
    queryClient.setQueryData(['clash-battles', playerTag], freshData);
    return freshData;
  };

  return {
    ...query,
    forceRefresh,
  };
}
