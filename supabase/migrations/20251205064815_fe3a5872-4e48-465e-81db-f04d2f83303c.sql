-- Create ai_feedback table for collecting user feedback on AI responses
CREATE TABLE public.ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  player_tag TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('coach_response', 'deck_recommendation', 'match_analysis', 'deck_analysis')),
  reference_id TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN,
  comment TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.ai_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.ai_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own feedback (e.g., add comment after rating)
CREATE POLICY "Users can update own feedback"
ON public.ai_feedback
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for analytics queries
CREATE INDEX idx_ai_feedback_user_id ON public.ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_type ON public.ai_feedback(feedback_type);
CREATE INDEX idx_ai_feedback_created_at ON public.ai_feedback(created_at DESC);
CREATE INDEX idx_ai_feedback_rating ON public.ai_feedback(rating) WHERE rating IS NOT NULL;