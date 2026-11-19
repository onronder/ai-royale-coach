import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  battles_drawn: number;
  mode: string;
  total_crowns: number;
  total_trophy_change: number;
  avg_elixir: number | null;
  trophy_samples: number;
  date: string;
  win_rate: number;
}

export const useDeckStats = (playerTag: string, days = 30) => {
  return useQuery({
    queryKey: ['deck-stats', playerTag, days],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deck_usage_stats')
        .select('*')
          .eq('observation_scope', 'recent-battles-v2')
        .eq('user_id', user.id)
        .eq('player_tag', canonicalTag(playerTag))
        .order('date', { ascending: false });

      if (error) throw error;

      // Calculate win rates and aggregate by deck
      const deckMap = new Map<string, DeckStat>();
      
      data?.forEach(stat => {
        const deckCards = Array.isArray(stat.deck_cards) ? stat.deck_cards as string[] : [];
        
        const key = `${stat.mode}:${stat.deck_hash}`;
        if (!deckMap.has(key)) {
          deckMap.set(key, {
            ...stat,
            deck_cards: deckCards,
            win_rate: stat.battles_played ? stat.battles_won / stat.battles_played : 0,
          });
        } else {
          const existing = deckMap.get(key)!;
          existing.battles_played += stat.battles_played;
          existing.battles_won += stat.battles_won;
          existing.battles_lost += stat.battles_lost;
          existing.total_crowns += stat.total_crowns;
          existing.total_trophy_change += stat.total_trophy_change;
          existing.battles_drawn += stat.battles_drawn;
          existing.trophy_samples += stat.trophy_samples;
          existing.win_rate = existing.battles_played ? existing.battles_won / existing.battles_played : 0;
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutate: createNotification } = useCreateNotification();
  
  return useMutation({
    mutationFn: async (playerTag: string) => {
      toast.loading(t('toasts.trackingDeckStats'), { id: 'deck-stats-track' });
      
      const { data, error } = await supabase.functions.invoke('track-deck-stats', {
        body: { playerTag }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, playerTag) => {
      queryClient.invalidateQueries({ queryKey: ['deck-stats', playerTag] });
      toast.success(t('toasts.deckStatsUpdated'), { id: 'deck-stats-track' });
      
      // Save to notification history
      createNotification({
        player_tag: playerTag,
        type: 'sync',
        title: t('deckStats.updated'),
        message: t('deckStats.updatedMessage'),
        icon_name: 'refresh-cw'
      });
    },
    onError: (error) => {
      toast.error(t('toasts.deckStatsUpdateFailed'), { id: 'deck-stats-track' });
      console.error('Deck stats tracking error:', error);
    },
  });
};