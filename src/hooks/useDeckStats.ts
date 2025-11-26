import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateNotification } from "./useNotifications";

export interface DeckStat {
  id: string;
  deck_cards: string[];
  deck_hash: string;
  battles_played: number;
  battles_won: number;
  battles_lost: number;
  total_crowns: number;
  total_trophy_change: number;
  avg_elixir: number;
  date: string;
  win_rate: number;
}

export const useDeckStats = (playerTag: string, days = 30) => {
  return useQuery({
    queryKey: ['deck-stats', playerTag, days],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await supabase
        .from('deck_usage_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .gte('date', fromDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      // Calculate win rates and aggregate by deck
      const deckMap = new Map<string, DeckStat>();
      
      data?.forEach(stat => {
        const deckCards = Array.isArray(stat.deck_cards) ? stat.deck_cards as string[] : [];
        
        if (!deckMap.has(stat.deck_hash)) {
          deckMap.set(stat.deck_hash, {
            ...stat,
            deck_cards: deckCards,
            win_rate: stat.battles_won / (stat.battles_won + stat.battles_lost),
          });
        } else {
          const existing = deckMap.get(stat.deck_hash)!;
          existing.battles_played += stat.battles_played;
          existing.battles_won += stat.battles_won;
          existing.battles_lost += stat.battles_lost;
          existing.total_crowns += stat.total_crowns;
          existing.total_trophy_change += stat.total_trophy_change;
          existing.win_rate = existing.battles_won / (existing.battles_won + existing.battles_lost);
        }
      });

      return {
        stats: data || [],
        aggregated: Array.from(deckMap.values()),
      };
    },
    enabled: !!playerTag,
  });
};

export const useTrackDeckStats = () => {
  const queryClient = useQueryClient();
  const { mutate: createNotification } = useCreateNotification();
  
  return useMutation({
    mutationFn: async (playerTag: string) => {
      toast.loading('Tracking deck statistics...', { id: 'deck-stats-track' });
      
      const { data, error } = await supabase.functions.invoke('track-deck-stats', {
        body: { playerTag }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, playerTag) => {
      queryClient.invalidateQueries({ queryKey: ['deck-stats', playerTag] });
      toast.success('Deck statistics updated successfully!', { id: 'deck-stats-track' });
      
      // Save to notification history
      createNotification({
        player_tag: playerTag,
        type: 'sync',
        title: 'Deck Stats Updated',
        message: 'Your deck statistics have been synced with the latest battle data',
        icon_name: 'refresh-cw'
      });
    },
    onError: (error) => {
      toast.error('Failed to update deck statistics', { id: 'deck-stats-track' });
      console.error('Deck stats tracking error:', error);
    },
  });
};