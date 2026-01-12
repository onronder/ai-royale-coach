-- Add activity tracking columns to winback_campaigns
ALTER TABLE public.winback_campaigns
ADD COLUMN target_user_activity_score integer,
ADD COLUMN target_user_ai_requests integer DEFAULT 0,
ADD COLUMN target_user_chat_messages integer DEFAULT 0,
ADD COLUMN target_user_battles_tracked integer DEFAULT 0,
ADD COLUMN target_user_linked_accounts integer DEFAULT 0,
ADD COLUMN target_user_active_days integer DEFAULT 0;

COMMENT ON COLUMN public.winback_campaigns.target_user_activity_score IS 'Composite activity score (0-100) based on engagement metrics';
COMMENT ON COLUMN public.winback_campaigns.target_user_ai_requests IS 'Total AI coach requests made by user';
COMMENT ON COLUMN public.winback_campaigns.target_user_chat_messages IS 'Total coach chat messages sent';
COMMENT ON COLUMN public.winback_campaigns.target_user_battles_tracked IS 'Total battles tracked via deck stats';
COMMENT ON COLUMN public.winback_campaigns.target_user_linked_accounts IS 'Number of player accounts linked';
COMMENT ON COLUMN public.winback_campaigns.target_user_active_days IS 'Number of distinct days with AI usage';

-- Create function to calculate user activity metrics
CREATE OR REPLACE FUNCTION public.get_user_activity_metrics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ai_requests integer := 0;
  v_ai_active_days integer := 0;
  v_chat_messages integer := 0;
  v_battles_tracked integer := 0;
  v_linked_accounts integer := 0;
  v_activity_score integer := 0;
BEGIN
  -- Get AI usage totals
  SELECT COALESCE(SUM(request_count), 0), COALESCE(COUNT(DISTINCT date), 0)
  INTO v_ai_requests, v_ai_active_days
  FROM user_ai_usage
  WHERE user_id = p_user_id;

  -- Get chat messages count
  SELECT COALESCE(COUNT(*), 0)
  INTO v_chat_messages
  FROM chat_messages
  WHERE user_id = p_user_id;

  -- Get battles tracked from deck usage stats
  SELECT COALESCE(SUM(battles_played), 0)
  INTO v_battles_tracked
  FROM deck_usage_stats
  WHERE user_id = p_user_id;

  -- Get linked player accounts count
  SELECT COALESCE(COUNT(*), 0)
  INTO v_linked_accounts
  FROM player_profiles
  WHERE user_id = p_user_id;

  -- Calculate composite score (0-100)
  -- Weight: AI requests (30%), Chat messages (20%), Battles (20%), Accounts (15%), Active days (15%)
  v_activity_score := LEAST(100, 
    (LEAST(v_ai_requests, 20) * 1.5)::integer +  -- max 30 points
    (LEAST(v_chat_messages, 10) * 2)::integer +   -- max 20 points
    (LEAST(v_battles_tracked / 10, 20))::integer + -- max 20 points
    (v_linked_accounts * 5)::integer +             -- max 15 points (3 accounts)
    (LEAST(v_ai_active_days, 7) * 2)::integer      -- max 14 points
  );

  RETURN jsonb_build_object(
    'activity_score', v_activity_score,
    'ai_requests', v_ai_requests,
    'ai_active_days', v_ai_active_days,
    'chat_messages', v_chat_messages,
    'battles_tracked', v_battles_tracked,
    'linked_accounts', v_linked_accounts,
    'is_active', (v_ai_requests > 0 OR v_chat_messages > 0 OR v_linked_accounts > 0)
  );
END;
$$;

-- Grant execute to authenticated users (admin check is done in the panel)
GRANT EXECUTE ON FUNCTION public.get_user_activity_metrics(uuid) TO authenticated;