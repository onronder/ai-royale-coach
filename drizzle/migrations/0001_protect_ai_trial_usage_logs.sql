DROP POLICY IF EXISTS "Users can delete own usage logs" ON public.daily_usage_logs;
CREATE POLICY "Users can delete own usage logs" ON public.daily_usage_logs FOR DELETE TO authenticated USING (auth.uid() = user_id AND feature_name NOT LIKE 'ai\_trial%');
DROP POLICY IF EXISTS "Users can insert own usage logs" ON public.daily_usage_logs;
CREATE POLICY "Users can insert own usage logs" ON public.daily_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND feature_name NOT LIKE 'ai\_trial%');
CREATE INDEX IF NOT EXISTS idx_daily_usage_logs_user_feature_time ON public.daily_usage_logs (user_id, feature_name, used_at DESC);