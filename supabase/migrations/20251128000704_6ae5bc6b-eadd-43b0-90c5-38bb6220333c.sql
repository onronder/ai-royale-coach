-- Add indexes for frequently queried tables
CREATE INDEX IF NOT EXISTS idx_player_cache_player_tag ON player_cache(player_tag);
CREATE INDEX IF NOT EXISTS idx_deck_usage_stats_player_tag ON deck_usage_stats(player_tag);
CREATE INDEX IF NOT EXISTS idx_deck_usage_stats_date ON deck_usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_card_mastery_player_tag ON card_mastery(player_tag);
CREATE INDEX IF NOT EXISTS idx_card_collection_player_tag ON card_collection(player_tag);
CREATE INDEX IF NOT EXISTS idx_chat_messages_player_tag ON chat_messages(player_tag);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Create rate limiting table for persistent rate limiting across edge function instances
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier)
);

-- Enable RLS but allow service role full access
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (edge functions use service role)
CREATE POLICY "Service role can manage rate limits" ON public.api_rate_limits
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_max_requests integer DEFAULT 30,
  p_window_seconds integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record api_rate_limits%ROWTYPE;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Try to get existing record
  SELECT * INTO v_record FROM api_rate_limits WHERE identifier = p_identifier;
  
  IF v_record IS NULL THEN
    -- Insert new record
    INSERT INTO api_rate_limits (identifier, request_count, window_start)
    VALUES (p_identifier, 1, now());
    RETURN true;
  END IF;
  
  -- Check if window has expired
  IF v_record.window_start < v_window_start THEN
    -- Reset window
    UPDATE api_rate_limits 
    SET request_count = 1, window_start = now() 
    WHERE identifier = p_identifier;
    RETURN true;
  END IF;
  
  -- Check if over limit
  IF v_record.request_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Increment counter
  UPDATE api_rate_limits 
  SET request_count = request_count + 1 
  WHERE identifier = p_identifier;
  RETURN true;
END;
$$;