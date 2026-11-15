-- Older recommendations have no reliable language. Keep them in history.
ALTER TABLE public.recommendation_history ADD COLUMN IF NOT EXISTS language text;
--> statement-breakpoint
ALTER TABLE public.card_mastery ADD COLUMN IF NOT EXISTS ai_tips_language text;
--> statement-breakpoint
-- Existing profiles default to English even when the player never chose it.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language_selected_at timestamptz;
--> statement-breakpoint
-- Email confirmation can precede the first authenticated client session.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  signup_language text := NEW.raw_user_meta_data->>'language';
BEGIN
  IF signup_language IN ('en','tr','es','fr','pt') THEN
    INSERT INTO public.profiles (id, email, preferred_language, language_selected_at)
    VALUES (NEW.id, NEW.email, signup_language, now());
  ELSE
    INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Native auth emails read user metadata; app and coaching emails read profiles.
CREATE OR REPLACE FUNCTION public.sync_auth_email_language()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE auth.users SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('language', NEW.preferred_language)
    WHERE id = NEW.id AND raw_user_meta_data->>'language' IS DISTINCT FROM NEW.preferred_language;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.sync_auth_email_language() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER sync_auth_email_language
AFTER UPDATE OF preferred_language, language_selected_at ON public.profiles
FOR EACH ROW WHEN (NEW.language_selected_at IS NOT NULL AND NEW.preferred_language IN ('en','tr','es','fr','pt'))
EXECUTE FUNCTION public.sync_auth_email_language();
--> statement-breakpoint
-- A non-English value could not have been the legacy English schema default.
UPDATE public.profiles SET language_selected_at = now()
WHERE language_selected_at IS NULL AND preferred_language IN ('tr','es','fr','pt');
--> statement-breakpoint
ALTER TABLE public.trial_coaching_followup ADD COLUMN IF NOT EXISTS delivery_language text;
--> statement-breakpoint
-- A retry uses the same provider key and must carry the same localized message.
CREATE OR REPLACE FUNCTION public.capture_coaching_delivery_language()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  SELECT coalesce(CASE WHEN p.language_selected_at IS NOT NULL THEN p.preferred_language END, t.language, 'en')
    INTO NEW.delivery_language
    FROM public.profiles p LEFT JOIN public.coaching_tasks t ON t.id = NEW.opted_task AND t.user_id = p.id
    WHERE p.id = NEW.user_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER capture_coaching_delivery_language
BEFORE UPDATE OF first_attempted_at ON public.trial_coaching_followup
FOR EACH ROW WHEN (OLD.first_attempted_at IS NULL AND NEW.first_attempted_at IS NOT NULL)
EXECUTE FUNCTION public.capture_coaching_delivery_language();
--> statement-breakpoint
CREATE OR REPLACE VIEW public.due_trial_coaching AS
SELECT c.user_id, c.subscription_id, c.player_tag, coalesce(f.delivery_language, c.language) AS language, u.email
FROM public.current_trial_coaching c JOIN auth.users u ON u.id = c.user_id
JOIN public.trial_coaching_followup f USING (user_id, subscription_id)
WHERE c.opted_in_at IS NOT NULL AND c.sent_at IS NULL AND c.returned_at IS NULL
  AND c.task_id = c.opted_task AND c.player_tag IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL
  AND now() >= c.started_at + interval '24 hours' AND now() < c.started_at + interval '48 hours';
