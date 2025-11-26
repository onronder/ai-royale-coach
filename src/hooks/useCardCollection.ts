import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCardCollection(playerTag: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['card-collection', playerTag],
    queryFn: async () => {
      if (!playerTag) throw new Error('Player tag is required');
      
      const { data, error } = await supabase
        .from('card_collection')
        .select('*')
        .eq('player_tag', playerTag)
        .order('rarity')
        .order('card_name');

      if (error) throw error;
      return data;
    },
    enabled: !!playerTag && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
