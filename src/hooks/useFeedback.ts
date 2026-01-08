import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
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

      const { error } = await supabase
        .from('ai_feedback')
        .insert([{
          user_id: user.id,
          player_tag: params.playerTag,
          feedback_type: params.feedbackType,
          reference_id: params.referenceId,
          rating: params.rating,
          helpful: params.helpful,
          comment: params.comment,
          context: (params.context || {}) as Json
        }]);

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
