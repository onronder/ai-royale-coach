ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acquisition_source jsonb;

CREATE TABLE public.polar_orders (
  order_id text PRIMARY KEY,
  user_id uuid,
  customer_id text,
  subscription_id text,
  amount integer NOT NULL DEFAULT 0,
  currency text,
  billing_reason text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.polar_orders TO authenticated;
GRANT ALL ON public.polar_orders TO service_role;
ALTER TABLE public.polar_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read orders" ON public.polar_orders FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  props jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_events_user_idx ON public.product_events(user_id, created_at);
GRANT SELECT, INSERT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own events" ON public.product_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND event_name IN ('ai_recommendation_viewed','ai_generation_failed','trial_quota_denied'));
CREATE POLICY "Admins read events" ON public.product_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));