import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateNotification } from "./useNotifications";

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
  const { mutate: createNotification } = useCreateNotification();
  
  return useMutation({
    mutationFn: async (playerTag: string) => {
      toast.loading('Calculating card mastery...', { id: 'card-mastery-calc' });
      
      const { data, error } = await supabase.functions.invoke('calculate-card-mastery', {
        body: { playerTag }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, playerTag) => {
      queryClient.invalidateQueries({ queryKey: ['card-mastery', playerTag] });
      toast.success('Card mastery calculated successfully!', { id: 'card-mastery-calc' });
      
      // Save to notification history
      createNotification({
        player_tag: playerTag,
        type: 'calculation',
        title: 'Card Mastery Calculated',
        message: 'Your card mastery levels have been updated with the latest data',
        icon_name: 'sparkles'
      });
    },
    onError: (error) => {
      toast.error('Failed to calculate card mastery', { id: 'card-mastery-calc' });
      console.error('Card mastery calculation error:', error);
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
      toast.loading(`Generating AI tips for ${cardName}...`, { id: `card-tips-${cardId}` });
      
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
      toast.success(`AI tips generated for ${variables.cardName}!`, { id: `card-tips-${variables.cardId}` });
    },
    onError: (error, variables) => {
      toast.error(`Failed to generate tips for ${variables.cardName}`, { id: `card-tips-${variables.cardId}` });
      console.error('Card tips generation error:', error);
    },
  });
};