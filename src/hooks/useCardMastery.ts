import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateNotification } from "./useNotifications";
import { useOperationProgress } from "./useOperationProgress";
import i18n from "@/i18n";

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
        title: i18n.t('cardMastery.calculated'),
        message: i18n.t('cardMastery.calculatedDesc'),
        icon_name: 'sparkles'
      });
    },
    onError: (error) => {
      toast.error(i18n.t('cardMastery.calculationFailed'));
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
      toast.loading(i18n.t('cardMastery.generatingFor', { card: cardName }), { id: `card-tips-${cardId}` });
      
      const { data, error } = await supabase.functions.invoke('generate-card-tips', {
        body: { cardName, winRate, timesUsed, bestPartners, worstMatchups, language: i18n.language }
      });
      
      if (error) {
        // Check for subscription required error
        if (error.message?.includes('403') || error.message?.includes('subscription_required')) {
          const subscriptionError = new Error('Subscription required') as any;
          subscriptionError.subscription_required = true;
          throw subscriptionError;
        }
        throw error;
      }
      
      // Check if response indicates subscription required
      if (data?.subscription_required) {
        const subscriptionError = new Error('Subscription required') as any;
        subscriptionError.subscription_required = true;
        throw subscriptionError;
      }

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
      toast.success(i18n.t('cardMastery.tipsGenerated', { card: variables.cardName }), { id: `card-tips-${variables.cardId}` });
    },
    onError: (error: unknown, variables) => {
      const errorObj = error as { subscription_required?: boolean };
      if (errorObj?.subscription_required) {
        toast.error(i18n.t('subscription.requiredForAI'), { 
          id: `card-tips-${variables.cardId}`,
          action: {
            label: i18n.t('subscription.upgrade'),
            onClick: () => window.location.href = '/auth?upgrade=true'
          }
        });
      } else {
        toast.error(i18n.t('cardMastery.tipsFailed', { card: variables.cardName }), { id: `card-tips-${variables.cardId}` });
      }
      console.error('Card tips generation error:', error);
    },
  });
};
