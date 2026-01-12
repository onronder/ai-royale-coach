CREATE OR REPLACE FUNCTION public.get_user_activity_metrics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Calculate composite score (0-100) with REBALANCED weights:
  -- AI requests: 30%, Battles: 25%, Chat: 15%, Accounts: 15%, Active days: 15%
  v_activity_score := LEAST(100, 
    (LEAST(v_ai_requests, 20) * 1.5)::integer +      -- max 30 points (30%)
    (LEAST(v_chat_messages, 15) * 1)::integer +      -- max 15 points (15%)
    (LEAST(v_battles_tracked / 10, 25))::integer +   -- max 25 points (25%)
    (LEAST(v_linked_accounts, 3) * 5)::integer +     -- max 15 points (15%)
    (LEAST(v_ai_active_days, 5) * 3)::integer        -- max 15 points (15%)
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
$function$;