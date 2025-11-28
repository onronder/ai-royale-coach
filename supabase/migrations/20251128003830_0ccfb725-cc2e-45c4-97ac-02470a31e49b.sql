-- SECURITY FIX: Restrict analyses table to user's own player tags only
DROP POLICY IF EXISTS "Authenticated users can view analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;

CREATE POLICY "Users can view own analyses" ON public.analyses
  FOR SELECT
  USING (player_tag IN (
    SELECT player_tag FROM public.player_profiles WHERE user_id = auth.uid()
  ));

-- SECURITY FIX: Restrict player_cache to user's own player tags only
DROP POLICY IF EXISTS "Authenticated users can read player cache" ON public.player_cache;
DROP POLICY IF EXISTS "Users can read own player cache" ON public.player_cache;

CREATE POLICY "Users can read own player cache" ON public.player_cache
  FOR SELECT
  USING (player_tag IN (
    SELECT player_tag FROM public.player_profiles WHERE user_id = auth.uid()
  ));

-- SECURITY FIX: Remove public access to api_rate_limits
-- Only the SECURITY DEFINER function check_rate_limit should access this table
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.api_rate_limits;

-- Create a restrictive policy - only allow service role access via the existing function
CREATE POLICY "No direct access to rate limits" ON public.api_rate_limits
  FOR ALL
  USING (false);
