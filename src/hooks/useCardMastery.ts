import { useContext } from 'react';
import { SubscriptionUserContext } from './useSubscription';
import { masteryOptions } from '@/lib/playerQueries';
import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
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
  battles_drawn: number;
  mode: string;
  total_crowns: number;
  avg_elixir_decks: number | null;
  best_partner_cards: string[];
  worst_matchup_cards: string[];
  mastery_level: number;
  mastery_progress: number;
  ai_tips: string | null;
  ai_tips_language: string | null;
  last_updated: string;
  win_rate: number;
  crown_avg: number;
}

export const useCardMastery = (playerTag: string) => {
  const account = useContext(SubscriptionUserContext);
  return useQuery({ ...masteryOptions(account, playerTag), select: data => data.map(card => ({
    ...card, win_rate: card.times_used ? card.battles_won / card.times_used : 0,
    crown_avg: card.times_used ? card.total_crowns / card.times_used : 0,
  })) });
};

export const useCalculateCardMastery = (playerTag: string) => {
  const account = useContext(SubscriptionUserContext);
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
      queryClient.invalidateQueries({ queryKey: ['player-context', account] });
      
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
  const account = useContext(SubscriptionUserContext);
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
      mode,
    }: { 
      cardName: string;
      winRate: number;
      timesUsed: number;
      bestPartners: string[];
      worstMatchups: string[];
      cardId: number;
      playerTag: string;
      mode: string;
    }) => {
      const language = i18n.resolvedLanguage ?? 'en';
      toast.loading(i18n.t('cardMastery.generatingFor', { card: cardName }), { id: `card-tips-${cardId}` });
      
      const { data, error } = await supabase.functions.invoke('generate-card-tips', {
        body: { cardName, winRate, timesUsed, bestPartners, worstMatchups, language, playerTag }
      });
      
      if (error) {
        // Check for subscription required error
        if (error.message?.includes('403') || error.message?.includes('subscription_required')) {
          const subscriptionError = new Error('Subscription required') as Error & { subscription_required: boolean };
          subscriptionError.subscription_required = true;
          throw subscriptionError;
        }
        throw error;
      }
      
      // Check if response indicates subscription required
      if (data?.subscription_required) {
        const subscriptionError = new Error('Subscription required') as Error & { subscription_required: boolean };
        subscriptionError.subscription_required = true;
        throw subscriptionError;
      }

      // Update card mastery with tips
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: saveError } = await supabase
          .from('card_mastery')
          .update({ ai_tips: data.tips, ai_tips_language: language })
          .eq('user_id', user.id)
          .eq('card_id', cardId)
          .eq('observation_scope', 'recent-battles-v2')
          .eq('mode', mode)
          .eq('player_tag', canonicalTag(playerTag));
        if (saveError) throw saveError;
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['player-context', account] });
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
