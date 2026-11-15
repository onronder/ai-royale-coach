-- A task has one follow-up. Keep the played deck and match together when that
-- follow-up changes the recommendation and starts a new match check.
ALTER TABLE public.coaching_tasks ADD COLUMN previous_match jsonb;

CREATE FUNCTION public.keep_completed_coaching_match() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.previous_match IS NOT NULL THEN
    RAISE EXCEPTION 'This coaching task already has a saved previous match';
  END IF;
  NEW.previous_match := jsonb_build_object(
    'battle_result', OLD.battle_result, 'matched_battle_key', OLD.matched_battle_key,
    'source_deck', OLD.source_deck, 'recommended_deck', OLD.recommended_deck,
    'recommendation', OLD.recommendation, 'shown_at', OLD.shown_at,
    'last_checked_at', OLD.last_checked_at, 'battles_fetched_at', OLD.battles_fetched_at
  );
  -- An opt-in for the completed recommendation cannot authorize its replacement.
  UPDATE public.trial_coaching_followup SET opted_task=NULL, opted_in_at=NULL, ticket=NULL
  WHERE user_id=OLD.user_id AND opted_task=OLD.id AND sent_at IS NULL AND returned_at IS NULL
    AND subscription_id IN (SELECT s.polar_subscription_id FROM public.user_subscriptions s
                           WHERE s.user_id=OLD.user_id AND s.status='trialing');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.keep_completed_coaching_match() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER keep_completed_coaching_match
BEFORE UPDATE OF battle_result ON public.coaching_tasks
FOR EACH ROW WHEN (OLD.battle_result IS NOT NULL AND NEW.battle_result IS NULL)
EXECUTE FUNCTION public.keep_completed_coaching_match();
