-- Minimal stand-in for the platform pieces; the trial email views/functions below are copied from the live database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS net;
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE TABLE net.calls (id serial, url text, body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.calls(url, body) VALUES (url, body) RETURNING id $$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY, preferred_language text, trial_started_at timestamptz, language_selected_at timestamptz);
CREATE TABLE public.user_subscriptions (user_id uuid, polar_subscription_id text, status text, current_period_start timestamptz,
  current_period_end timestamptz, ends_at timestamptz, created_at timestamptz DEFAULT now(), cancel_at_period_end boolean NOT NULL DEFAULT false);
CREATE TABLE public.player_profiles (user_id uuid, player_tag text);
CREATE TABLE public.coaching_tasks (id uuid PRIMARY KEY, user_id uuid, player_tag text, language text, recommendation jsonb,
  battle_result jsonb, shown_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE public.trial_coaching_followup (user_id uuid, subscription_id text, reason text, answered_at timestamptz,
  opted_in_at timestamptz, opted_task uuid, returned_at timestamptz, sent_at timestamptz, ticket uuid, attempted_at timestamptz,
  first_attempted_at timestamptz, delivery_language text, resend_message_id text, summary_opted_in_at timestamptz, summary_task uuid,
  summary_player_tag text, summary_ticket uuid, summary_attempted_at timestamptz, summary_first_attempted_at timestamptz,
  summary_sent_at timestamptz, summary_message_id text, summary_payload jsonb, reminder_payload jsonb, PRIMARY KEY (user_id, subscription_id));

CREATE VIEW public.current_trial_coaching AS SELECT s.user_id, s.polar_subscription_id AS subscription_id, s.cancel_at_period_end,
    COALESCE(s.current_period_start, p.trial_started_at, s.created_at) AS started_at, task.id AS task_id, task.player_tag, task.language,
    f.opted_task, f.reason, f.opted_in_at, f.returned_at, f.sent_at
   FROM user_subscriptions s JOIN profiles p ON p.id = s.user_id
     LEFT JOIN trial_coaching_followup f ON f.user_id = s.user_id AND f.subscription_id = s.polar_subscription_id
     LEFT JOIN LATERAL (SELECT t.id, t.player_tag, t.language FROM coaching_tasks t
          WHERE t.user_id = s.user_id AND t.recommendation IS NOT NULL AND t.battle_result IS NULL
            AND EXISTS (SELECT 1 FROM player_profiles pp WHERE pp.user_id = t.user_id AND upper(ltrim(pp.player_tag, '#')) = t.player_tag)
          ORDER BY (t.id = f.opted_task) DESC NULLS LAST, t.shown_at DESC NULLS LAST, t.created_at DESC, t.id LIMIT 1) task ON true
  WHERE s.status = 'trialing' AND s.polar_subscription_id IS NOT NULL AND COALESCE(s.ends_at, s.current_period_end) > now();

CREATE VIEW public.due_trial_coaching AS SELECT c.user_id, c.subscription_id, c.player_tag, COALESCE(f.delivery_language, c.language) AS language, u.email
   FROM current_trial_coaching c JOIN auth.users u ON u.id = c.user_id JOIN trial_coaching_followup f USING (user_id, subscription_id)
  WHERE c.opted_in_at IS NOT NULL AND c.sent_at IS NULL AND c.returned_at IS NULL AND c.task_id = c.opted_task AND c.player_tag IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL AND now() >= c.started_at + interval '24 hours' AND now() < c.started_at + interval '48 hours';

CREATE VIEW public.due_trial_summary AS SELECT f.user_id, f.subscription_id, f.summary_task AS task_id, f.summary_player_tag AS player_tag,
    COALESCE(CASE WHEN p.language_selected_at IS NOT NULL THEN p.preferred_language END, t.language, 'en') AS language,
    u.email, COALESCE(s.ends_at, s.current_period_end) AS trial_ends_at
   FROM trial_coaching_followup f JOIN user_subscriptions s ON s.user_id = f.user_id AND s.polar_subscription_id = f.subscription_id
     JOIN profiles p ON p.id = f.user_id JOIN auth.users u ON u.id = f.user_id
     JOIN coaching_tasks t ON t.id = f.summary_task AND t.user_id = f.user_id AND t.player_tag = f.summary_player_tag AND t.recommendation IS NOT NULL
  WHERE s.status = 'trialing' AND f.summary_opted_in_at IS NOT NULL AND f.summary_sent_at IS NULL
    AND COALESCE(s.ends_at, s.current_period_end) > now() AND COALESCE(s.ends_at, s.current_period_end) <= now() + interval '12 hours'
    AND u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM player_profiles pp WHERE pp.user_id = f.user_id AND upper(ltrim(pp.player_tag, '#')) = f.summary_player_tag);

CREATE FUNCTION public.trial_coaching_state() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  SELECT jsonb_build_object('subscriptionId', c.subscription_id, 'playerTag', c.player_tag,
    'optedIn', c.opted_in_at IS NOT NULL AND c.opted_task IS NOT DISTINCT FROM c.task_id, 'sent', c.sent_at IS NOT NULL)
  FROM public.current_trial_coaching c WHERE c.user_id = auth.uid(); $function$;
CREATE FUNCTION public.trial_summary_state() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
  SELECT jsonb_build_object('optedIn', f.summary_opted_in_at IS NOT NULL, 'playerTag', f.summary_player_tag, 'taskId', f.summary_task)
  FROM public.user_subscriptions s LEFT JOIN public.trial_coaching_followup f ON f.user_id = s.user_id AND f.subscription_id = s.polar_subscription_id
  WHERE s.user_id = auth.uid() LIMIT 1; $function$;
-- Deprecated functions referenced by the migration's REVOKE/COMMENT statements.
CREATE FUNCTION public.take_trial_coaching_reminder(uuid) RETURNS void LANGUAGE sql AS 'SELECT';
CREATE FUNCTION public.claim_trial_coaching_reminder(uuid) RETURNS void LANGUAGE sql AS 'SELECT';
CREATE FUNCTION public.freeze_trial_coaching_reminder(uuid,text,jsonb) RETURNS void LANGUAGE sql AS 'SELECT';
CREATE FUNCTION public.claim_trial_summary(uuid) RETURNS void LANGUAGE sql AS 'SELECT';
CREATE FUNCTION public.freeze_trial_summary(uuid,text,uuid,jsonb) RETURNS void LANGUAGE sql AS 'SELECT';
