ALTER TABLE public.user_subscriptions ADD cancel_at_period_end boolean DEFAULT false, ADD canceled_at timestamptz;
CREATE TABLE public.profiles (id uuid PRIMARY KEY,email text,preferred_language text,trial_started_at timestamptz,
  trial_ends_at timestamptz,trial_used boolean,winback_email_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),
  language_selected_at timestamptz,terms_accepted_at timestamptz,terms_version text,
  onboarding_completed_at timestamptz,chat_retention_days integer,
  whats_new_seen_version text,acquisition_source jsonb);
CREATE TABLE public.polar_orders (order_id text PRIMARY KEY,subscription_id text,user_id uuid,created_at timestamptz,
  currency text,status text,amount integer,billing_reason text);
CREATE TABLE public.player_profiles (user_id uuid,player_tag text);
CREATE TABLE public.analyses (player_tag text,analysis_type text);
CREATE TABLE public.webhook_events (user_id uuid,event_id text,event_type text,status text,created_at timestamptz);
CREATE TABLE public.daily_usage_logs(user_id uuid,used_at timestamptz,feature_name text);
CREATE TABLE public.chat_messages(user_id uuid,created_at timestamptz,role text);
CREATE TABLE public.product_events(user_id uuid,created_at timestamptz,event_name text);
CREATE FUNCTION public.get_user_activity_metrics(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

INSERT INTO auth.users(id,email) SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
  'fixture'||i||'@example.invalid' FROM generate_series(1,6) i;
INSERT INTO public.profiles(id,email,trial_started_at,trial_ends_at,trial_used)
  SELECT id,email,now()-interval '13 days',now()-interval '10 days',true FROM auth.users;
INSERT INTO public.admins VALUES ('00000000-0000-0000-0000-000000000006');
-- Pre-migration rows: a confirmed legacy trial and a paid-only subscription.
INSERT INTO public.user_subscriptions(user_id,polar_subscription_id,status,current_period_start,current_period_end)
  SELECT id,'legacy','active',now()-interval '10 days',now()+interval '20 days' FROM public.profiles WHERE email='fixture1@example.invalid';
INSERT INTO public.polar_orders SELECT 'zero','legacy',id,trial_started_at,'usd','paid',0,'subscription_create'
  FROM public.profiles WHERE email='fixture1@example.invalid';
INSERT INTO public.user_subscriptions(user_id,polar_subscription_id,status,current_period_start,current_period_end)
  SELECT id,'paid-only','active',now(),now()+interval '30 days' FROM public.profiles WHERE email='fixture5@example.invalid';
