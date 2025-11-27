import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { toast } from "@/hooks/use-toast";

export function useClashRoyaleBattles(playerTag: string | null) {
  return useQuery<ClashRoyaleBattle[]>({
    queryKey: ['clash-battles', playerTag],
    queryFn: async () => {
      if (!playerTag) throw new Error('Player tag is required');

      const normalizedTag = playerTag.replace('#', '').toUpperCase();
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
          return cached.battles_data;
        }
      }

      // Fetch from API
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clash-royale-api?endpoint=battles&playerTag=${encodeURIComponent(playerTag)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        if (cached?.battles_data) {
          console.warn('API failed, using stale cache');
          toast({
            title: "Using cached data",
            description: "API unavailable - showing previously saved battle history",
            variant: "default",
          });
          return cached.battles_data;
        }
        throw new Error(`Failed to fetch battles: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if this was a fresh API fetch
      const cacheHit = response.headers.get('X-Cache-Hit') === 'true';
      if (!cacheHit && Array.isArray(data)) {
        toast({
          title: "Battle history updated",
          description: `Loaded ${data.length} recent battles`,
        });
      }

      return data;
    },
    enabled: !!playerTag,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: false,
    retry: 1,
  });
}
