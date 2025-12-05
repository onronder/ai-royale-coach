import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export type FeedbackType = 'coach_response' | 'deck_recommendation' | 'match_analysis' | 'deck_analysis';

interface SubmitFeedbackParams {
  playerTag: string;
  feedbackType: FeedbackType;
  referenceId?: string;
  rating?: number;
  helpful?: boolean;
  comment?: string;
  context?: Record<string, unknown>;
}

export function useFeedback() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const submitFeedback = useMutation({
    mutationFn: async (params: SubmitFeedbackParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Type assertion needed because Supabase types don't include the new table yet
      const { error } = await (supabase as any)
        .from('ai_feedback')
        .insert({
          user_id: user.id,
          player_tag: params.playerTag,
          feedback_type: params.feedbackType,
          reference_id: params.referenceId,
          rating: params.rating,
          helpful: params.helpful,
          comment: params.comment,
          context: params.context || {}
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('feedback.thankYou'),
        description: t('feedback.thankYouDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
    onError: (error) => {
      console.error('Feedback submission error:', error);
      toast({
        title: t('common.error'),
        description: t('feedback.submitError'),
        variant: "destructive",
      });
    }
  });

  return {
    submitFeedback: submitFeedback.mutate,
    isSubmitting: submitFeedback.isPending
  };
}
