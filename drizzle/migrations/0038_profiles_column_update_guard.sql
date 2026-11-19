REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (preferred_language, language_selected_at, terms_accepted_at, terms_version, onboarding_completed_at, chat_retention_days, whats_new_seen_version, acquisition_source) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);