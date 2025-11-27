import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClashRoyalePlayer } from "@/services/clashRoyaleApi";

export function useClashRoyalePlayer(playerTag: string | null) {
  return useQuery<ClashRoyalePlayer>({
    queryKey: ['clash-player', playerTag],
    queryFn: async () => {
      if (!playerTag) throw new Error('Player tag is required');

      // Try to get cached data first for immediate display
      const normalizedTag = playerTag.replace('#', '').toUpperCase();
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
          return cached.player_data;
        }
      }

      // Otherwise fetch from API via clashRoyaleApi service
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clash-royale-api?endpoint=player&playerTag=${encodeURIComponent(playerTag)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        // If API fails but we have stale cache, return it
        if (cached?.player_data) {
          console.warn('API failed, using stale cache');
          return cached.player_data;
        }
        throw new Error(`Failed to fetch player data: ${response.statusText}`);
      }

      return await response.json();
    },
    enabled: !!playerTag,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchInterval: false, // Don't auto-refetch to avoid rate limits
    retry: 1,
  });
}
