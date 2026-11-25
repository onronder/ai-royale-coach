-- Apply this whole file in one transaction before deploying its webhook caller.
ALTER TABLE public.user_subscriptions ADD COLUMN polar_resource_created_at timestamptz;
CREATE TABLE ai_royale_private.closed_polar_subscriptions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('ended','replaced')),
  last_event_at timestamptz,
  PRIMARY KEY (user_id, subscription_id)
);
ALTER TABLE ai_royale_private.closed_polar_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_royale_private.closed_polar_subscriptions FROM PUBLIC, anon, authenticated, service_role;

-- Earlier receipts have a receipt time, not an authenticated provider event time.
-- Seed only processed ends with independent evidence of the resource/owner pair.
INSERT INTO ai_royale_private.closed_polar_subscriptions (user_id, subscription_id, reason)
SELECT DISTINCT e.user_id, e.event_id, 'ended'
FROM public.webhook_events e JOIN auth.users u ON u.id=e.user_id
WHERE e.status='processed' AND e.event_type IN ('subscription.revoked','subscription.ended')
  AND e.event_id IS NOT NULL AND (
    EXISTS (SELECT FROM public.user_subscriptions s WHERE s.user_id=e.user_id AND s.polar_subscription_id=e.event_id)
    OR EXISTS (SELECT FROM public.polar_orders o WHERE o.user_id=e.user_id AND o.subscription_id=e.event_id)
  );

CREATE FUNCTION public.apply_polar_subscription_event(
  p_user_id uuid, p_subscription_id text, p_kind text, p_event_at timestamptz,
  p_delivery_id text, p_fields jsonb
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  previous public.user_subscriptions%ROWTYPE;
  closed_at timestamptz;
  decision text;
  first_end boolean;
  resource_start timestamptz := (p_fields->>'provider_created_at')::timestamptz;
  replacement_allowed boolean;
  terminal boolean := p_kind IN ('subscription.revoked','subscription.ended');
  start_event boolean := p_kind IN ('subscription.created','subscription.active');
  full_update boolean := start_event OR p_kind='subscription.updated';
  period_end timestamptz := (p_fields->>'current_period_end')::timestamptz;
  period_start timestamptz := (p_fields->>'current_period_start')::timestamptz;
  incoming_status text := p_fields->>'status';
  slots integer := (p_fields->>'account_slots')::integer;
  summary jsonb := jsonb_strip_nulls(jsonb_build_object(
    'webhookId', p_delivery_id, 'providerStatus', p_fields->>'provider_status', 'providerEventAt', p_event_at));
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('subscription.created','subscription.active','subscription.updated',
    'subscription.canceled','subscription.uncanceled','subscription.revoked','subscription.ended','subscription.past_due') THEN
    RAISE EXCEPTION 'Unsupported subscription event' USING ERRCODE='22023';
  END IF;

  IF p_user_id IS NULL OR nullif(p_subscription_id,'') IS NULL OR p_event_at IS NULL THEN
    decision := 'pending_reference';
  ELSE
    -- All webhook subscription writers enter this account-only gate, including a first
    -- delivery with no parent row. Other workflows never acquire this billing gate.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 57));
    IF NOT EXISTS (SELECT FROM public.profiles WHERE id=p_user_id) THEN
      RAISE EXCEPTION 'Subscriber profile unavailable' USING ERRCODE='40001';
    END IF;
    SELECT * INTO previous FROM public.user_subscriptions WHERE user_id=p_user_id FOR UPDATE;
    -- Different resources have independent modification clocks. A late end on the old
    -- resource can have a later timestamp than the purchase that replaced it.
    replacement_allowed := CASE
      WHEN previous.polar_subscription_id IS NULL THEN true
      WHEN previous.polar_resource_created_at IS NOT NULL AND resource_start IS NOT NULL
        THEN resource_start>previous.polar_resource_created_at
      ELSE previous.last_event_at IS NULL OR coalesce(resource_start,p_event_at)>previous.last_event_at
    END;


    IF terminal THEN
      SELECT NOT EXISTS (SELECT FROM ai_royale_private.closed_polar_subscriptions
        WHERE user_id=p_user_id AND subscription_id=p_subscription_id AND reason='ended') INTO first_end;
      closed_at := greatest(p_event_at, CASE WHEN previous.polar_subscription_id=p_subscription_id THEN previous.last_event_at END);
      INSERT INTO ai_royale_private.closed_polar_subscriptions AS c VALUES (p_user_id,p_subscription_id,'ended',closed_at)
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET reason='ended',last_event_at=greatest(c.last_event_at,excluded.last_event_at)
      RETURNING last_event_at INTO closed_at;

      UPDATE public.user_subscriptions SET status='expired', account_slots=0,
        last_event_at=greatest(last_event_at,closed_at), updated_at=now()
      WHERE user_id=p_user_id AND polar_subscription_id=p_subscription_id
        AND (status IS DISTINCT FROM 'expired' OR account_slots IS DISTINCT FROM 0 OR last_event_at IS NULL OR last_event_at<closed_at);
      IF previous.polar_subscription_id IS DISTINCT FROM p_subscription_id THEN
        decision := 'recorded_end';
      ELSE
        UPDATE public.profiles SET trial_used=true, updated_at=now() WHERE id=p_user_id AND trial_used IS DISTINCT FROM true;
        decision := CASE WHEN first_end THEN 'ended' ELSE 'duplicate' END;
      END IF;
    ELSIF EXISTS (SELECT FROM ai_royale_private.closed_polar_subscriptions WHERE user_id=p_user_id AND subscription_id=p_subscription_id) THEN
      decision := 'closed_id';
    ELSIF NOT full_update AND previous.polar_subscription_id IS DISTINCT FROM p_subscription_id THEN
      decision := 'pending_current_subscription';
    ELSIF previous.polar_subscription_id IS DISTINCT FROM p_subscription_id AND previous.polar_subscription_id IS NOT NULL
          AND NOT replacement_allowed THEN
      decision := 'pending_subscription_order';
    ELSIF previous.polar_subscription_id=p_subscription_id AND previous.last_event_at>p_event_at THEN
      decision := 'stale';
    ELSIF (p_kind<>'subscription.past_due' AND incoming_status IS NULL) OR (full_update AND slots IS NULL) THEN
      decision := 'pending_status_or_product';
    ELSIF start_event AND previous.polar_subscription_id=p_subscription_id AND previous.status=incoming_status THEN
      UPDATE public.user_subscriptions SET last_event_at=greatest(last_event_at,p_event_at),
        polar_resource_created_at=coalesce(polar_resource_created_at,resource_start)
      WHERE user_id=p_user_id AND polar_subscription_id=p_subscription_id
        AND (last_event_at IS NULL OR last_event_at<p_event_at OR (polar_resource_created_at IS NULL AND resource_start IS NOT NULL));
      decision := 'duplicate';
    ELSIF p_kind='subscription.past_due' THEN
      UPDATE public.user_subscriptions SET status='past_due', last_event_at=p_event_at, updated_at=now()
      WHERE user_id=p_user_id AND polar_subscription_id=p_subscription_id AND (last_event_at IS NULL OR last_event_at<=p_event_at);
      decision := CASE WHEN FOUND THEN 'applied' ELSE 'stale' END;
    ELSE
      INSERT INTO public.user_subscriptions AS s (user_id,polar_subscription_id,polar_customer_id,polar_customer_external_id,
        status,variant_id,account_slots,current_period_start,current_period_end,cancel_at_period_end,canceled_at,ends_at,last_event_at,polar_resource_created_at)
      SELECT p_user_id,p_subscription_id,p_fields->>'customer_id',p_user_id::text,
        incoming_status,p_fields->>'product_id',coalesce(slots,1),period_start,period_end,
        coalesce((p_fields->>'cancel_at_period_end')::boolean,false),(p_fields->>'canceled_at')::timestamptz,
        (p_fields->>'ends_at')::timestamptz,p_event_at,resource_start
      WHERE NOT EXISTS (SELECT FROM ai_royale_private.closed_polar_subscriptions WHERE user_id=p_user_id AND subscription_id=p_subscription_id)
      ON CONFLICT (user_id) DO UPDATE SET
        polar_subscription_id=excluded.polar_subscription_id, polar_customer_id=excluded.polar_customer_id,
        polar_customer_external_id=excluded.polar_customer_external_id, status=excluded.status,
        variant_id=CASE WHEN full_update THEN excluded.variant_id ELSE s.variant_id END,
        account_slots=CASE WHEN full_update THEN excluded.account_slots ELSE s.account_slots END,
        pending_account_slots=CASE WHEN full_update THEN NULL ELSE s.pending_account_slots END,
        pending_change_effective_at=CASE WHEN full_update THEN NULL ELSE s.pending_change_effective_at END,
        current_period_start=CASE WHEN p_fields ? 'current_period_start' THEN excluded.current_period_start ELSE s.current_period_start END,
        current_period_end=CASE WHEN p_fields ? 'current_period_end' THEN excluded.current_period_end ELSE s.current_period_end END,
        cancel_at_period_end=excluded.cancel_at_period_end,canceled_at=excluded.canceled_at,ends_at=excluded.ends_at,
        polar_resource_created_at=CASE WHEN s.polar_subscription_id IS DISTINCT FROM excluded.polar_subscription_id
          THEN excluded.polar_resource_created_at ELSE coalesce(s.polar_resource_created_at,excluded.polar_resource_created_at) END,
        last_event_at=excluded.last_event_at,updated_at=now()
      WHERE (s.polar_subscription_id IS NOT DISTINCT FROM p_subscription_id AND (s.last_event_at IS NULL OR s.last_event_at<=excluded.last_event_at))
         OR (s.polar_subscription_id IS DISTINCT FROM p_subscription_id AND full_update AND replacement_allowed);
      IF FOUND THEN
        decision := CASE WHEN previous.id IS NULL THEN 'created' ELSE 'applied' END;
        IF previous.polar_subscription_id IS NOT NULL AND previous.polar_subscription_id<>p_subscription_id THEN
          INSERT INTO ai_royale_private.closed_polar_subscriptions VALUES (p_user_id,previous.polar_subscription_id,'replaced',previous.last_event_at)
          ON CONFLICT DO NOTHING;
        END IF;
        IF full_update AND incoming_status='trialing' THEN
          UPDATE public.profiles SET trial_started_at=coalesce(period_start,p_event_at),trial_ends_at=period_end,
            trial_used=false,updated_at=now() WHERE id=p_user_id;
        ELSIF full_update AND p_fields->>'provider_status'='active' THEN
          UPDATE public.profiles SET trial_used=true,updated_at=now() WHERE id=p_user_id AND trial_used IS DISTINCT FROM true;
        END IF;
      ELSE
        decision := 'stale';
      END IF;
    END IF;
  END IF;

  -- Preserve data used by existing revenue queries. Include the raw provider status
  -- separately from the application's mapped status for future lifecycle backfills.
  IF start_event THEN
    summary := summary || jsonb_build_object('accountSlots',slots,'isTrialing',incoming_status='trialing','isNewSubscription',decision='created');
  ELSIF p_kind='subscription.updated' THEN
    summary := summary || jsonb_build_object('accountSlots',slots,'status',incoming_status);
  ELSIF p_kind IN ('subscription.canceled','subscription.uncanceled') THEN
    summary := summary || jsonb_build_object('status',p_fields->>'provider_status','cancelAtPeriodEnd',p_fields->'cancel_at_period_end');
  END IF;
  INSERT INTO public.webhook_events(event_type,event_id,user_id,status,error_message,payload_summary)
  VALUES (p_kind,p_subscription_id,p_user_id,
    CASE WHEN decision LIKE 'pending%' THEN 'pending' WHEN decision IN ('created','applied','ended','recorded_end') THEN 'processed' ELSE 'skipped' END,
    CASE WHEN decision IN ('created','applied','ended') THEN NULL ELSE decision END, summary);
  RETURN decision;
END $$;

REVOKE ALL ON FUNCTION public.apply_polar_subscription_event(uuid,text,text,timestamptz,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_polar_subscription_event(uuid,text,text,timestamptz,text,jsonb) TO service_role;
