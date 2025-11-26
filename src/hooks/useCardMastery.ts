import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CardMastery {
  id: string;
  card_id: number;
  card_name: string;
  times_used: number;
  battles_won: number;
  battles_lost: number;
  total_crowns: number;
  avg_elixir_decks: number | null;
  best_partner_cards: string[];
  worst_matchup_cards: string[];
  mastery_level: number;
  mastery_progress: number;
  ai_tips: string | null;
  last_updated: string;
  win_rate: number;
  crown_avg: number;
}

export const useCardMastery = (playerTag: string) => {
  return useQuery({
    queryKey: ['card-mastery', playerTag],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('card_mastery')
        .select('*')
        .eq('user_id', user.id)
        .eq('player_tag', playerTag)
        .order('mastery_level', { ascending: false })
        .order('times_used', { ascending: false });

      if (error) throw error;

      return (data || []).map(card => ({
        ...card,
        win_rate: card.battles_won / (card.battles_won + card.battles_lost),
        crown_avg: card.total_crowns / card.times_used,
      }));
    },
    enabled: !!playerTag,
  });
};

export const useCalculateCardMastery = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (playerTag: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-card-mastery', {
        body: { playerTag }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, playerTag) => {
      queryClient.invalidateQueries({ queryKey: ['card-mastery', playerTag] });
    },
  });
};

export const useGenerateCardTips = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      cardName, 
      winRate, 
      timesUsed, 
      bestPartners, 
      worstMatchups,
      cardId,
      playerTag,
    }: { 
      cardName: string;
      winRate: number;
      timesUsed: number;
      bestPartners: string[];
      worstMatchups: string[];
      cardId: number;
      playerTag: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-card-tips', {
        body: { cardName, winRate, timesUsed, bestPartners, worstMatchups }
      });
      
      if (error) throw error;

      // Update card mastery with tips
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('card_mastery')
          .update({ ai_tips: data.tips })
          .eq('user_id', user.id)
          .eq('card_id', cardId);
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['card-mastery', variables.playerTag] });
    },
  });
};