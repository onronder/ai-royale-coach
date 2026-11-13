DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.api_request_logs;
CREATE POLICY "Users can insert own logs" ON public.api_request_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated users can view claims" ON public.player_tag_claims;
CREATE POLICY "Users can view own claims" ON public.player_tag_claims FOR SELECT TO authenticated USING (auth.uid() = claimed_by_user_id OR public.is_admin(auth.uid()));