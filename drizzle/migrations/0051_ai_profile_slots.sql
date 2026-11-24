-- A linked player is user-managed. The AI entitlement on that link is server-managed.
REVOKE ALL PRIVILEGES ON public.user_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
REVOKE ALL PRIVILEGES ON public.player_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE, INSERT (user_id, player_tag, note, last_seen_at),
  UPDATE (note, last_seen_at) ON public.player_profiles TO authenticated;
-- Legacy service clients must also use the transactional writers for this flag.
REVOKE INSERT, UPDATE ON public.player_profiles FROM service_role;
GRANT INSERT (id, user_id, player_tag, created_at, note, last_seen_at),
  UPDATE (note, last_seen_at) ON public.player_profiles TO service_role;
DROP POLICY "Users can manage own player profiles" ON public.player_profiles;
CREATE POLICY "Owner updates linked player metadata" ON public.player_profiles
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.enforce_max_player_tags() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> NEW.user_id THEN
    RAISE EXCEPTION 'Invalid profile owner' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 50));
  IF (SELECT count(*) FROM public.player_profiles WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 player tags per user allowed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_max_player_tags() FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
-- Preserve valid choices. For accounts over capacity, let the owner choose again.
UPDATE public.user_subscriptions s SET account_slots = s.account_slots
WHERE EXISTS (SELECT 1 FROM public.player_profiles p WHERE p.user_id = s.user_id AND p.ai_enabled
  GROUP BY p.user_id HAVING count(*) > greatest(s.account_slots, 0)
    OR NOT public.marketing_subscription_access(s.user_id));
UPDATE public.player_profiles p SET ai_enabled = false WHERE p.ai_enabled
  AND NOT EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = p.user_id);
