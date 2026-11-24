-- Deploy these transactional writers before switching the account and billing Edge functions.
CREATE FUNCTION public.select_my_ai_profiles(p_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  slots integer;
  chosen integer := cardinality(p_ids);
  owned integer;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  SELECT greatest(account_slots, 0) INTO slots FROM public.user_subscriptions
    WHERE user_id = actor FOR UPDATE;
  IF NOT FOUND OR NOT public.marketing_subscription_access(actor) THEN
    RAISE EXCEPTION 'No active subscription' USING ERRCODE = '22023';
  END IF;
  IF chosen IS NULL OR chosen > slots OR coalesce(array_ndims(p_ids), 1) <> 1 THEN
    RAISE EXCEPTION 'Invalid profile selection' USING ERRCODE = '22023', DETAIL = slots::text;
  END IF;
  SELECT count(*) INTO owned FROM (
    SELECT id FROM public.player_profiles WHERE user_id = actor AND id = ANY(p_ids)
      ORDER BY id FOR UPDATE
  ) locked;
  IF owned <> chosen THEN RAISE EXCEPTION 'Invalid profile selection' USING ERRCODE = '22023'; END IF;

  UPDATE public.player_profiles SET ai_enabled = (id = ANY(p_ids))
    WHERE user_id = actor AND ai_enabled IS DISTINCT FROM (id = ANY(p_ids));
  UPDATE public.user_subscriptions SET needs_ai_selection = false
    WHERE user_id = actor AND needs_ai_selection IS DISTINCT FROM false;
  RETURN jsonb_build_object('success', true, 'enabledCount', chosen, 'maxSlots', slots);
END $$;
REVOKE ALL ON FUNCTION public.select_my_ai_profiles(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.select_my_ai_profiles(uuid[]) TO authenticated;
--> statement-breakpoint
-- AFTER sees the actual INSERT or conflict UPDATE and shares its subscription row lock
-- with manual selection. A renewal of the same plan preserves even an empty selection.
CREATE FUNCTION public.sync_subscription_ai_profiles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  has_access boolean := public.marketing_subscription_access(NEW.user_id);
  slots integer := greatest(NEW.account_slots, 0);
  activation boolean;
  fill_open_choice boolean := false;
  linked integer;
  enabled integer;
  needs_choice boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activation := true;
  ELSE
    fill_open_choice := coalesce(OLD.needs_ai_selection, false) AND slots > greatest(OLD.account_slots, 0);
    activation := OLD.polar_subscription_id IS DISTINCT FROM NEW.polar_subscription_id
      OR OLD.status NOT IN ('active', 'trialing')
      OR (OLD.status = 'trialing' AND NEW.status = 'active');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 50));
  SELECT count(*), count(*) FILTER (WHERE ai_enabled) INTO linked, enabled
    FROM public.player_profiles WHERE user_id = NEW.user_id;
  IF NOT has_access OR slots = 0 OR enabled > slots THEN
    UPDATE public.player_profiles SET ai_enabled = false WHERE user_id = NEW.user_id AND ai_enabled;
    needs_choice := has_access AND slots > 0 AND linked > slots;
  ELSIF (activation OR fill_open_choice) AND linked <= slots THEN
    UPDATE public.player_profiles SET ai_enabled = true
      WHERE user_id = NEW.user_id AND ai_enabled IS DISTINCT FROM true;
    needs_choice := false;
  ELSIF activation THEN
    needs_choice := enabled <> slots;
  ELSE
    needs_choice := coalesce(OLD.needs_ai_selection, false);
  END IF;
  UPDATE public.user_subscriptions SET needs_ai_selection = needs_choice
    WHERE user_id = NEW.user_id AND needs_ai_selection IS DISTINCT FROM needs_choice;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.sync_subscription_ai_profiles() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER sync_subscription_ai_profiles AFTER INSERT OR UPDATE OF
  account_slots, status, polar_subscription_id, current_period_end, cancel_at_period_end, ends_at
  ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_ai_profiles();
