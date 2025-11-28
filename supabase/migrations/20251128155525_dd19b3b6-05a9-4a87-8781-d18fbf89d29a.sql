-- Create AI usage tracking table for quotas
CREATE TABLE public.user_ai_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.user_ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own AI usage"
ON public.user_ai_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage"
ON public.user_ai_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI usage"
ON public.user_ai_usage FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_user_ai_usage_user_date ON public.user_ai_usage(user_id, date);

-- Add indexes for chat message pagination and retention
CREATE INDEX idx_chat_messages_pagination ON public.chat_messages(user_id, player_tag, created_at DESC);

-- Add composite index for analyses table optimization
CREATE INDEX idx_analyses_lookup ON public.analyses(player_tag, analysis_type, created_at DESC);