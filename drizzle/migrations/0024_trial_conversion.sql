-- Order creation can precede collection by days. Preserve the provider's paid
-- event time separately, including when a delayed paid event follows a refund.
ALTER TABLE public.polar_orders ADD COLUMN paid_at timestamptz, ADD COLUMN provider_updated_at timestamptz, ADD COLUMN refunded_net_cents integer, ADD COLUMN discount_amount_cents integer;
CREATE INDEX polar_order_subscription_time ON public.polar_orders(subscription_id,created_at);
CREATE INDEX polar_order_user_time ON public.polar_orders(user_id,created_at);
CREATE INDEX trial_chat_user_time ON public.chat_messages(user_id,created_at) WHERE role='user';
CREATE INDEX trial_event_subscription_time ON public.webhook_events(event_id, created_at)
  WHERE status='processed' AND event_type IN ('order.paid','subscription.canceled');
CREATE FUNCTION public.preserve_order_observation() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE paid_time timestamptz := least(OLD.paid_at,NEW.paid_at);
BEGIN
  IF OLD.provider_updated_at > NEW.provider_updated_at
    OR (OLD.provider_updated_at IS NOT NULL AND NEW.provider_updated_at IS NULL)
    OR ((NEW.provider_updated_at IS NULL OR OLD.provider_updated_at IS NOT DISTINCT FROM NEW.provider_updated_at)
        AND ((OLD.status IN ('refunded','partially_refunded') AND NEW.status IN ('paid','pending'))
          OR (OLD.status='refunded' AND NEW.status='partially_refunded') OR (OLD.status='paid' AND NEW.status='pending'))) THEN NEW := OLD; END IF;
  NEW.paid_at := paid_time;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_order_observation BEFORE UPDATE ON public.polar_orders
  FOR EACH ROW EXECUTE FUNCTION public.preserve_order_observation();

-- One record per evidenced Polar trial. Subscription updates can roll the billing period
-- forward or replace the user's subscription. Neither operation moves the original trial.
CREATE TABLE public.trial_conversion_periods (
  subscription_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  superseded_at timestamptz,
  first_cancel_at timestamptz,
  CHECK (ends_at > started_at)
);
CREATE INDEX trial_conversion_periods_start ON public.trial_conversion_periods(started_at);
CREATE INDEX trial_conversion_periods_user ON public.trial_conversion_periods(user_id, started_at);

CREATE TABLE public.trial_test_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE TABLE public.trial_surface_visits (
  subscription_id text NOT NULL REFERENCES public.trial_conversion_periods ON DELETE CASCADE,
  day_utc date NOT NULL,
  phase text NOT NULL,
  step text NOT NULL,
  first_seen timestamptz NOT NULL,
  last_seen timestamptz NOT NULL,
  PRIMARY KEY (subscription_id, day_utc, phase, step)
);
ALTER TABLE public.trial_conversion_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_test_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_surface_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trial_conversion_periods, public.trial_test_accounts, public.trial_surface_visits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.trial_test_accounts TO service_role;

CREATE FUNCTION public.capture_conversion_period() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.polar_subscription_id IS DISTINCT FROM NEW.polar_subscription_id THEN
    UPDATE public.trial_conversion_periods SET superseded_at = greatest(started_at, least(now(), coalesce(NEW.current_period_start,now())))
      WHERE subscription_id = OLD.polar_subscription_id AND superseded_at IS NULL;
  END IF;
  IF NEW.status = 'trialing' AND NEW.polar_subscription_id IS NOT NULL
      AND NEW.current_period_end > NEW.current_period_start THEN
    INSERT INTO public.trial_conversion_periods(subscription_id,user_id,started_at,ends_at)
      VALUES (NEW.polar_subscription_id, NEW.user_id, NEW.current_period_start, NEW.current_period_end)
      ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.canceled_at IS NOT NULL THEN
    UPDATE public.trial_conversion_periods SET first_cancel_at=least(first_cancel_at,NEW.canceled_at)
    WHERE subscription_id=NEW.polar_subscription_id AND NEW.canceled_at BETWEEN started_at AND ends_at
      AND (first_cancel_at IS NULL OR NEW.canceled_at<first_cancel_at);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_conversion_period() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER capture_conversion_period AFTER INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.capture_conversion_period();

-- Historical profile timestamps are account-scoped. Use them only when a start
-- order on this subscription corroborates the profile's trial start. Do not guess
-- from a renewed period end, a free order alone, or a subscription's creation date.
WITH source AS (
  SELECT s.polar_subscription_id, s.user_id,
    CASE WHEN s.status='trialing' THEN s.current_period_start ELSE p.trial_started_at END AS started,
    CASE WHEN s.status='trialing' THEN s.current_period_end ELSE p.trial_ends_at END AS ended
  FROM public.user_subscriptions s JOIN public.profiles p ON p.id=s.user_id
  WHERE s.polar_subscription_id IS NOT NULL AND (s.status='trialing' OR EXISTS (
    SELECT 1 FROM public.polar_orders o WHERE o.subscription_id=s.polar_subscription_id
      AND o.status='paid' AND o.amount=0 AND o.billing_reason='subscription_create'
      AND o.created_at BETWEEN p.trial_started_at - interval '10 minutes' AND p.trial_started_at + interval '10 minutes'
  ))
)
INSERT INTO public.trial_conversion_periods(subscription_id,user_id,started_at,ends_at)
  SELECT polar_subscription_id,user_id,started,ended FROM source WHERE ended > started
  ON CONFLICT DO NOTHING;
UPDATE public.trial_conversion_periods t SET first_cancel_at=s.canceled_at
FROM public.user_subscriptions s WHERE s.polar_subscription_id=t.subscription_id
  AND s.canceled_at BETWEEN t.started_at AND t.ends_at;

-- Observations only. The caller cannot choose the account, subscription, time or phase.
CREATE FUNCTION public.observe_trial_step(p_step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR p_step IS NULL OR p_step NOT IN ('app_opened','coach_card_seen','recommendation_requested') THEN
    RAISE EXCEPTION 'Invalid observation';
  END IF;
  INSERT INTO public.trial_surface_visits(subscription_id, day_utc, phase, step, first_seen, last_seen)
  SELECT t.subscription_id, (now() AT TIME ZONE 'UTC')::date,
    CASE WHEN s.status='past_due' THEN 'recovery'
         WHEN s.status='active' THEN 'paid'
         WHEN now() >= t.ends_at OR s.status IN ('expired','cancelled','canceled') THEN 'ended'
         WHEN s.cancel_at_period_end THEN 'renewal_off' ELSE 'trial' END,
    p_step, now(), now()
  FROM public.user_subscriptions s JOIN public.trial_conversion_periods t
    ON t.subscription_id=s.polar_subscription_id AND t.user_id=s.user_id
  WHERE s.user_id=auth.uid() AND t.superseded_at IS NULL
  ON CONFLICT (subscription_id,day_utc,phase,step) DO UPDATE SET last_seen=greatest(trial_surface_visits.last_seen,EXCLUDED.last_seen);
END $$;
REVOKE ALL ON FUNCTION public.observe_trial_step(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.observe_trial_step(text) TO authenticated;

CREATE VIEW public.trial_conversion_facts AS
SELECT t.subscription_id,t.user_id,p.email,t.started_at AS trial_start,t.ends_at AS trial_end,
  coalesce(s.status,'superseded') AS status,coalesce(s.cancel_at_period_end,false) AS renewal_off,
  (qa.user_id IS NOT NULL) AS is_test, cancel.ts AS canceled_at, pay.first_paid_at, pay.has_payment, pay.within_d7, pay.uncertain_d7,
  tags.linked_tags, tags.has_saved_summary,
  activity.ai_uses, activity.chat_messages, activity.active_days, activity.last_seen,
  activity.card_seen, activity.requested, activity.recommendation_seen, activity.matched,
  activity.last_action_after_cancel, activity.first_return_after_end,
  CASE WHEN s.user_id IS NULL THEN 'superseded'
       WHEN s.status='past_due' THEN 'payment_recovery'
       WHEN pay.has_payment THEN 'customer'
       WHEN s.status='active' THEN 'payment_review'
       WHEN s.status='trialing' AND t.ends_at>now() THEN
         CASE WHEN s.cancel_at_period_end THEN 'trial_renewal_off' ELSE 'trial_renewal_on' END
       WHEN s.status IN ('expired','cancelled','canceled') AND t.ends_at<=now()
         AND cancel.ts IS NOT NULL AND activity.used AND NOT EXISTS (
           SELECT 1 FROM public.polar_orders pending WHERE pending.subscription_id=t.subscription_id
             AND pending.status='pending' AND pending.amount>0
         ) AND NOT EXISTS (
           SELECT 1 FROM public.polar_orders old WHERE old.status IN ('paid','refunded','partially_refunded') AND old.amount>0
             AND (old.user_id=t.user_id OR old.subscription_id=t.subscription_id OR EXISTS (
               SELECT 1 FROM public.trial_conversion_periods prior WHERE prior.user_id=t.user_id AND prior.subscription_id=old.subscription_id))
         ) THEN 'expired_winback'
       ELSE 'other' END AS segment
FROM public.trial_conversion_periods t
JOIN public.profiles p ON p.id=t.user_id
LEFT JOIN public.user_subscriptions s ON s.polar_subscription_id=t.subscription_id AND s.user_id=t.user_id
LEFT JOIN public.trial_test_accounts qa ON qa.user_id=t.user_id
LEFT JOIN LATERAL (
  SELECT min(ts) AS ts FROM (
    SELECT t.first_cancel_at AS ts UNION ALL SELECT s.canceled_at UNION ALL
    SELECT w.created_at FROM public.webhook_events w WHERE w.event_id=t.subscription_id
      AND w.user_id=t.user_id AND w.status='processed' AND w.event_type='subscription.canceled'
  ) c WHERE ts BETWEEN t.started_at AND t.ends_at
) cancel ON true
LEFT JOIN LATERAL (
  SELECT min(o.paid_at) AS first_paid_at, count(*)>0 AS has_payment,
    coalesce(bool_or(coalesce(o.paid_at,receipt.observed_at)<t.ends_at+interval '7 days'),false) AS within_d7,
    coalesce(bool_or(o.paid_at IS NULL AND o.created_at<t.ends_at+interval '7 days'
      AND (receipt.observed_at IS NULL OR receipt.observed_at>=t.ends_at+interval '7 days')),false) AS uncertain_d7
  FROM public.polar_orders o LEFT JOIN LATERAL (
    SELECT min(w.created_at) AS observed_at FROM public.webhook_events w
    WHERE w.event_id=o.order_id AND w.event_type='order.paid' AND w.status='processed' AND w.created_at>=o.created_at
  ) receipt ON true WHERE o.subscription_id=t.subscription_id AND o.status='paid' AND o.amount>0
    AND coalesce(o.paid_at,o.created_at)>=t.ends_at
) pay ON true
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS linked_tags, coalesce(bool_or(EXISTS (
    SELECT 1 FROM public.analyses a WHERE a.analysis_type='profile_summary'
      AND a.player_tag IN (pp.player_tag,'#'||pp.player_tag)
  )), false) AS has_saved_summary FROM public.player_profiles pp WHERE pp.user_id=t.user_id AND s.user_id IS NOT NULL
) tags ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE kind='ai' AND ts<t.ends_at)::integer AS ai_uses,
    count(*) FILTER (WHERE kind='chat' AND ts<t.ends_at)::integer AS chat_messages,
    count(DISTINCT (ts AT TIME ZONE 'UTC')::date) FILTER (WHERE ts<t.ends_at AND kind<>'ai')::integer AS active_days,
    max(last_ts) FILTER (WHERE kind<>'ai') AS last_seen,
    min(ts) FILTER (WHERE kind='coach_card_seen' AND ts<t.ends_at) AS card_seen,
    min(ts) FILTER (WHERE kind='recommendation_requested' AND ts<t.ends_at) AS requested,
    min(ts) FILTER (WHERE kind='ai_recommendation_viewed' AND ts<t.ends_at) AS recommendation_seen,
    min(ts) FILTER (WHERE kind='coaching_first_match' AND ts<t.ends_at) AS matched,
    max(last_ts) FILTER (WHERE kind<>'ai' AND last_ts>cancel.ts) AS last_action_after_cancel,
    min(ts) FILTER (WHERE kind<>'ai' AND ts>=t.ends_at) AS first_return_after_end,
    count(*) FILTER (WHERE ts<t.ends_at AND kind IN ('ai','chat','ai_recommendation_viewed','coaching_follow_up','coaching_first_match'))>0 AS used
  FROM (
    SELECT d.used_at AS ts,d.used_at AS last_ts,'ai' AS kind FROM public.daily_usage_logs d
      WHERE d.user_id=t.user_id AND d.feature_name='ai_trial'
    UNION ALL SELECT m.created_at,m.created_at,'chat' FROM public.chat_messages m WHERE m.user_id=t.user_id AND m.role='user'
    UNION ALL SELECT e.created_at,e.created_at,e.event_name FROM public.product_events e
      WHERE e.user_id=t.user_id AND e.event_name IN ('ai_recommendation_viewed','coaching_follow_up','coaching_first_match')
    UNION ALL SELECT v.first_seen,v.last_seen,v.step FROM public.trial_surface_visits v WHERE v.subscription_id=t.subscription_id
  ) events WHERE ts>=t.started_at AND (t.superseded_at IS NULL OR ts<t.superseded_at)
) activity ON true
WHERE NOT public.is_admin(t.user_id);

REVOKE ALL ON public.trial_conversion_facts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.admin_trial_conversion(p_days integer DEFAULT 30, p_include_tests boolean DEFAULT false)
RETURNS SETOF public.trial_conversion_facts LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT f.* FROM public.trial_conversion_facts f
    WHERE (p_days IS NULL OR f.trial_start >= now()-make_interval(days=>p_days))
      AND (p_include_tests OR NOT f.is_test) ORDER BY f.trial_start DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_trial_conversion(integer,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_trial_conversion(integer,boolean) TO authenticated;


-- Existing admin clients continue to receive the original column contract.
CREATE OR REPLACE FUNCTION public.get_trial_funnel(p_days integer DEFAULT 30)
RETURNS TABLE(user_id uuid,email text,status text,trial_start timestamptz,trial_end timestamptz,canceled_at timestamptz,hours_to_cancel numeric,linked_tags integer,ai_uses integer,chat_messages integer,active_days integer,last_seen timestamptz,converted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT f.user_id,f.email,f.status,f.trial_start,f.trial_end,f.canceled_at,
    extract(epoch FROM f.canceled_at-f.trial_start)/3600,f.linked_tags,f.ai_uses,f.chat_messages,
    f.active_days,f.last_seen,f.has_payment FROM public.admin_trial_conversion(p_days) f
$$;

CREATE OR REPLACE FUNCTION public.get_trial_revenue_metrics(p_days integer DEFAULT 90)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  WITH cohort AS MATERIALIZED (SELECT * FROM public.admin_trial_conversion(p_days)),
  orders AS (
    SELECT o.* FROM public.polar_orders o WHERE o.created_at >= now()-make_interval(days=>p_days)
  ), currencies AS (
    SELECT upper(currency) AS currency, count(*) AS orders,sum(amount) AS cents FROM orders
      WHERE status='paid' AND amount>0 GROUP BY upper(currency)
  ), denied AS (
    SELECT e.* FROM public.product_events e WHERE e.event_name='trial_quota_denied'
      AND e.created_at>=now()-make_interval(days=>p_days)
  )
  SELECT jsonb_build_object(
    'unclassified_subscriptions',(SELECT count(*) FROM public.user_subscriptions s
      WHERE s.created_at>=now()-make_interval(days=>p_days) AND NOT public.is_admin(s.user_id)
        AND NOT EXISTS (SELECT 1 FROM public.trial_test_accounts qa WHERE qa.user_id=s.user_id)
        AND NOT EXISTS (SELECT 1 FROM public.trial_conversion_periods t WHERE t.subscription_id=s.polar_subscription_id)),
    'eligible_trials',(SELECT count(*) FROM cohort WHERE trial_end+interval '7 days'<=now()),
    'eligible_paid',(SELECT count(*) FROM cohort WHERE trial_end+interval '7 days'<=now() AND within_d7),
    'unknown_paid_time',(SELECT count(*) FROM cohort WHERE trial_end+interval '7 days'<=now() AND NOT within_d7 AND uncertain_d7),
    'zero_orders',(SELECT count(*) FROM orders WHERE amount=0),
    'positive_orders',(SELECT count(*) FROM orders WHERE status='paid' AND amount>0),
    'positive_amount_cents',(SELECT coalesce(sum(amount),0) FROM orders WHERE status='paid' AND amount>0 AND lower(currency)='usd'),
    'paid_by_currency',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY currency),'[]') FROM currencies c),
    'pending_orders',(SELECT count(*) FROM orders WHERE amount>0 AND status='pending'),
    'void_or_refunded_orders',(SELECT count(*) FROM orders WHERE amount>0 AND status IN ('void','refunded','partially_refunded')),
    'quota_denials',(SELECT count(*) FROM denied),
    'quota_denied_users',(SELECT count(DISTINCT user_id) FROM denied),
    'denied_then_cancelled',(SELECT count(DISTINCT c.user_id) FROM cohort c JOIN denied d ON d.user_id=c.user_id AND d.created_at BETWEEN c.trial_start AND c.canceled_at),
    'renewal_off_while_trialing',(SELECT count(*) FROM cohort WHERE segment='trial_renewal_off')
  ) INTO result;
  RETURN result;
END $$;

-- The send-ready list is a subset of the in-app return cohort. It is a read-only
-- preview; the existing sender independently enforces permission at delivery.
CREATE FUNCTION public.admin_winback_candidates() RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT public.get_user_activity_metrics(f.user_id) || jsonb_build_object(
    'id',p.id,'email',p.email,'preferred_language',p.preferred_language,
    'trial_ends_at',f.trial_end,'trial_used',p.trial_used,'winback_email_sent_at',p.winback_email_sent_at)
  FROM public.trial_conversion_facts f JOIN public.profiles p ON p.id=f.user_id
  WHERE NOT f.is_test AND f.segment='expired_winback' AND (public.marketing_decision(f.user_id)->>'allowed')::boolean;
END $$;
REVOKE ALL ON FUNCTION public.admin_winback_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_winback_candidates() TO authenticated;

-- Recheck the commercial segment even if the admin page was left open.
CREATE FUNCTION public.claim_winback_delivery(p_campaign text,p_user uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.trial_conversion_facts
    WHERE user_id=p_user AND segment='expired_winback' AND NOT is_test) THEN
    RETURN jsonb_build_object('action','blocked','reason','ineligible');
  END IF;
  RETURN public.claim_marketing_delivery(p_campaign,p_user,p_payload);
END $$;
REVOKE ALL ON FUNCTION public.claim_winback_delivery(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_winback_delivery(text,uuid,jsonb) TO service_role;

-- Empty at installation. A future approved experiment needs an explicit window;
-- competing experiments cannot overlap. A user gets one arm across devices/tags.
CREATE TABLE public.return_experiments (
  experiment_key text PRIMARY KEY,
  window_utc tstzrange NOT NULL CHECK (NOT isempty(window_utc) AND NOT lower_inf(window_utc)
    AND NOT upper_inf(window_utc) AND lower_inc(window_utc) AND NOT upper_inc(window_utc)),
  EXCLUDE USING gist (window_utc WITH &&)
);
CREATE TABLE public.return_experiment_accounts (
  experiment_key text NOT NULL REFERENCES public.return_experiments,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arm text NOT NULL CHECK (arm IN ('standard','offer')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  dismissed_at timestamptz,
  checkout_at timestamptz,
  PRIMARY KEY (experiment_key,user_id)
);
ALTER TABLE public.return_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_experiment_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.return_experiments, public.return_experiment_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.return_experiments TO service_role;

-- Called by the future saved-summary placement. Both arms are enrolled at the
-- same point, before exposure. Seeing a page never grants email permission.
CREATE FUNCTION public.my_return_experiment() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; uid uuid := auth.uid(); choice public.return_experiment_accounts;
BEGIN
  SELECT experiment_key INTO k FROM public.return_experiments WHERE window_utc @> now();
  IF uid IS NULL OR k IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.trial_conversion_facts WHERE user_id=uid AND segment='expired_winback'
      AND has_saved_summary AND NOT is_test
  ) THEN RETURN NULL; END IF;
  INSERT INTO public.return_experiment_accounts(experiment_key,user_id,arm)
    VALUES(k,uid,CASE WHEN random()<0.5 THEN 'standard' ELSE 'offer' END)
    ON CONFLICT DO NOTHING;
  SELECT * INTO choice FROM public.return_experiment_accounts WHERE experiment_key=k AND user_id=uid;
  RETURN jsonb_build_object('key',k,'arm',choice.arm,'seen',choice.seen_at IS NOT NULL,'dismissed',choice.dismissed_at IS NOT NULL);
END $$;

CREATE FUNCTION public.observe_return_offer(p_key text,p_step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_step IS NULL OR p_step NOT IN ('seen','dismissed') THEN RAISE EXCEPTION 'Invalid observation'; END IF;
  UPDATE public.return_experiment_accounts a SET seen_at=coalesce(a.seen_at,now()),
    dismissed_at=CASE WHEN p_step='dismissed' THEN coalesce(a.dismissed_at,now()) ELSE a.dismissed_at END
  FROM public.return_experiments e WHERE e.experiment_key=p_key AND e.window_utc @> now()
    AND a.experiment_key=e.experiment_key AND a.user_id=auth.uid() AND a.arm='offer';
END $$;

CREATE FUNCTION public.record_return_checkout(p_user uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  UPDATE public.return_experiment_accounts a SET checkout_at=now() FROM public.return_experiments e
    WHERE e.experiment_key=a.experiment_key AND e.window_utc @> now() AND a.user_id=p_user AND a.checkout_at IS NULL
$$;
REVOKE ALL ON FUNCTION public.my_return_experiment(),public.observe_return_offer(text,text),public.record_return_checkout(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_return_experiment(),public.observe_return_offer(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_return_checkout(uuid) TO service_role;

-- Denominator = all assigned accounts in a mature window, including zero spend.
-- Report paid order net amounts in one currency. Fully refunded/void/pending do
-- not contribute. A historical partial refund without its amount is reported as unresolved.
CREATE FUNCTION public.admin_return_results(p_key text,p_days integer,p_currency text DEFAULT 'usd')
RETURNS TABLE(arm text,assigned bigint,seen bigint,dismissed bigint,checkout_started bigint,mature bigint,
  paying bigint,full_price_renewals bigint,paid_net_cents bigint,unreconciled_partial_refunds bigint,missing_payment_times bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_days IS NULL OR p_days NOT IN (30,60) THEN RAISE EXCEPTION 'Use 30 or 60 days'; END IF;
  RETURN QUERY
  WITH measured AS (
    SELECT a.*, a.assigned_at+make_interval(days=>p_days)<=now() AS ready,
      o.net_cents,o.partials,o.unknown_time,o.full_price_renewal FROM public.return_experiment_accounts a
    LEFT JOIN LATERAL (
      SELECT coalesce(sum(greatest(0,v.amount-coalesce(v.refunded_net_cents,0))) FILTER (
        WHERE v.status IN ('paid','partially_refunded') AND v.amount>0 AND v.paid_at IS NOT NULL),0)::bigint AS net_cents,
        count(*) FILTER (WHERE v.status='partially_refunded' AND v.refunded_net_cents IS NULL) AS partials, count(*) FILTER (WHERE v.status IN ('paid','partially_refunded') AND v.amount>0 AND v.paid_at IS NULL) AS unknown_time,
        bool_or(v.status='paid' AND v.amount>0 AND v.discount_amount_cents=0 AND v.billing_reason='subscription_cycle'
          AND EXISTS (SELECT 1 FROM public.polar_orders earlier WHERE earlier.subscription_id=v.subscription_id
            AND earlier.status IN ('paid','partially_refunded') AND earlier.amount>0
            AND earlier.paid_at>=a.assigned_at AND earlier.paid_at<v.paid_at)) AS full_price_renewal
      FROM public.polar_orders v
      WHERE lower(v.currency)=lower(p_currency) AND coalesce(v.paid_at,v.created_at)>=a.assigned_at
        AND coalesce(v.paid_at,v.created_at)<a.assigned_at+make_interval(days=>p_days) AND (
          v.user_id=a.user_id OR (v.user_id IS NULL AND (
          EXISTS (SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=a.user_id AND s.polar_subscription_id=v.subscription_id)
          OR EXISTS (SELECT 1 FROM public.trial_conversion_periods t WHERE t.user_id=a.user_id AND t.subscription_id=v.subscription_id))))
    ) o ON true WHERE a.experiment_key=p_key
  )
  SELECT m.arm,count(*),count(m.seen_at),count(m.dismissed_at),count(m.checkout_at),count(*) FILTER(WHERE ready),
    count(*) FILTER(WHERE ready AND net_cents>0),count(*) FILTER(WHERE ready AND full_price_renewal),CASE WHEN coalesce(sum(unknown_time+partials) FILTER(WHERE ready),0)=0 THEN sum(net_cents) FILTER(WHERE ready)::bigint END,
    sum(partials) FILTER(WHERE ready)::bigint,sum(unknown_time) FILTER(WHERE ready)::bigint FROM measured m GROUP BY m.arm;
END $$;
REVOKE ALL ON FUNCTION public.admin_return_results(text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_return_results(text,integer,text) TO authenticated;

CREATE FUNCTION public.admin_set_trial_test_account(p_user uuid,p_test boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_test IS NULL OR p_user IS NULL THEN RAISE EXCEPTION 'Missing account or choice'; END IF;
  IF p_test THEN
    INSERT INTO public.trial_test_accounts(user_id) VALUES (p_user) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.trial_test_accounts WHERE user_id=p_user;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_trial_test_account(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_trial_test_account(uuid,boolean) TO authenticated;
