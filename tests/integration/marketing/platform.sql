-- Schema-only stand-ins (no rows) for the tables 0024–0027 read, so the consent suite runs the full migration chain.
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
