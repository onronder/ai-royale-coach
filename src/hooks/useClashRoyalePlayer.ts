import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClashRoyalePlayer } from "@/services/clashRoyaleApi";
import { toast } from "@/hooks/use-toast";

export function useClashRoyalePlayer(playerTag: string | null) {
  return useQuery<ClashRoyalePlayer>({
    queryKey: ['clash-player', playerTag],
    queryFn: async () => {
      if (!playerTag) throw new Error('Player tag is required');

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

      // Fetch from API
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clash-royale-api?endpoint=player&playerTag=${encodeURIComponent(playerTag)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        if (cached?.player_data) {
          console.warn('API failed, using stale cache');
          toast({
            title: "Using cached data",
            description: "API unavailable - showing previously saved player profile",
            variant: "default",
          });
          return cached.player_data;
        }
        throw new Error(`Failed to fetch player data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if this was a fresh API fetch (not cached on server)
      const cacheHit = response.headers.get('X-Cache-Hit') === 'true';
      if (!cacheHit) {
        toast({
          title: "Player data updated",
          description: `Fresh profile data loaded for ${data.name || normalizedTag}`,
        });
      }

      return data;
    },
    enabled: !!playerTag,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: false,
    retry: 1,
  });
}
