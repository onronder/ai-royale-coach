-- =============================================
-- ACCESS CONTROL SYSTEM: Fraud Protection + Daily Quotas
-- =============================================

-- 1. Create player_tag_claims table (Fraud Protection)
-- Tracks which user "owns" trial rights for a specific player tag
CREATE TABLE public.player_tag_claims (
  player_tag TEXT PRIMARY KEY,
  claimed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX idx_player_tag_claims_user ON public.player_tag_claims(claimed_by_user_id);

-- Enable RLS
ALTER TABLE public.player_tag_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_tag_claims:
-- Authenticated users can check if a tag is claimed (for availability check)
CREATE POLICY "Authenticated users can view claims"
  ON public.player_tag_claims
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own claims
CREATE POLICY "Users can claim unclaimed tags"
  ON public.player_tag_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = claimed_by_user_id);

-- No updates or deletes allowed (claims are permanent to prevent cycling)

-- 2. Create daily_usage_logs table (Quota System)
-- Granular feature usage tracking
CREATE TABLE public.daily_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient quota queries
CREATE INDEX idx_daily_usage_user_date ON public.daily_usage_logs(user_id, used_at);
CREATE INDEX idx_daily_usage_feature ON public.daily_usage_logs(user_id, feature_name, used_at);
CREATE INDEX idx_daily_usage_player ON public.daily_usage_logs(player_tag, used_at);

-- Enable RLS
ALTER TABLE public.daily_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_usage_logs:
-- Users can only view their own usage logs
CREATE POLICY "Users can view own usage logs"
  ON public.daily_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own usage logs
CREATE POLICY "Users can insert own usage logs"
  ON public.daily_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own logs (for data cleanup)
CREATE POLICY "Users can delete own usage logs"
  ON public.daily_usage_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Helper Functions

-- Function to check daily feature usage count
CREATE OR REPLACE FUNCTION public.get_daily_feature_usage(
  p_user_id UUID,
  p_feature_name TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM public.daily_usage_logs
  WHERE user_id = p_user_id
    AND feature_name = p_feature_name
    AND used_at::DATE = p_date;
$$;

-- Function to check if a player tag is available for trial (not claimed by another user)
CREATE OR REPLACE FUNCTION public.is_player_tag_available_for_trial(
  p_player_tag TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.player_tag_claims
    WHERE player_tag = UPPER(REPLACE(p_player_tag, '#', ''))
      AND claimed_by_user_id != p_user_id
  );
$$;

-- Function to claim a player tag for trial (returns true if user now owns the claim)
CREATE OR REPLACE FUNCTION public.claim_player_tag_for_trial(
  p_player_tag TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_tag TEXT;
BEGIN
  v_normalized_tag := UPPER(REPLACE(p_player_tag, '#', ''));
  
  -- Try to insert the claim (will fail silently if already claimed)
  INSERT INTO public.player_tag_claims (player_tag, claimed_by_user_id)
  VALUES (v_normalized_tag, p_user_id)
  ON CONFLICT (player_tag) DO NOTHING;
  
  -- Return true if this user owns the claim
  RETURN EXISTS (
    SELECT 1 FROM public.player_tag_claims
    WHERE player_tag = v_normalized_tag
      AND claimed_by_user_id = p_user_id
  );
END;
$$;