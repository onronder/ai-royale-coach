import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateNotification } from "./useNotifications";
import { useOperationProgress } from "./useOperationProgress";

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

export const useCalculateCardMastery = (playerTag: string) => {
  const queryClient = useQueryClient();
  const { mutate: createNotification } = useCreateNotification();
  const { progress } = useOperationProgress({
    playerTag,
    operationType: 'card_mastery_calculation',
    enabled: true,
  });
  
  const mutation = useMutation({
    mutationFn: async (tag: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-card-mastery', {
        body: { playerTag: tag }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, tag) => {
      queryClient.invalidateQueries({ queryKey: ['card-mastery', tag] });
      
      // Save to notification history
      createNotification({
        player_tag: tag,
        type: 'calculation',
        title: 'Card Mastery Calculated',
        message: 'Your card mastery levels have been updated with the latest data',
        icon_name: 'sparkles'
      });
    },
    onError: (error) => {
      toast.error('Failed to calculate card mastery');
      console.error('Card mastery calculation error:', error);
    },
  });

  return {
    ...mutation,
    progress,
  };
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