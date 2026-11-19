-- Remaining profile columns in the current application schema.
ALTER TABLE public.profiles
  ADD trial_started_at timestamptz, ADD trial_ends_at timestamptz,
  ADD trial_used boolean DEFAULT false, ADD winback_email_sent_at timestamptz,
  ADD terms_accepted_at timestamptz, ADD terms_version text,
  ADD onboarding_completed_at timestamptz, ADD chat_retention_days integer,
  ADD whats_new_seen_version text, ADD acquisition_source jsonb;
-- Unrelated dependencies needed to execute the complete real 0013 migration.
CREATE TABLE public.recommendation_history(id uuid);
CREATE TABLE public.card_mastery(id uuid);
CREATE TABLE public.coaching_tasks(id uuid,user_id uuid,language text);
CREATE TABLE public.trial_coaching_followup(user_id uuid,subscription_id text,
  opted_task uuid,first_attempted_at timestamptz);
CREATE TABLE public.current_trial_coaching(user_id uuid,subscription_id text,player_tag text,
  language text,opted_in_at timestamptz,sent_at timestamptz,returned_at timestamptz,
  task_id uuid,opted_task uuid,started_at timestamptz);
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
