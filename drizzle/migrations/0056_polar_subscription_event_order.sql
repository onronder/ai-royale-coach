-- First statement fails before any DDL if the runner autocommits individual statements.
-- Readers can continue. Retry the whole transaction if a writer holds this lock.
LOCK TABLE public.user_subscriptions IN EXCLUSIVE MODE NOWAIT;
CREATE TABLE ai_royale_private.polar_subscription_lifecycles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text NOT NULL,
  closed_reason text CHECK (closed_reason IN ('ended','replaced')),
  last_event_at timestamptz,
  provider_created_at timestamptz,
  PRIMARY KEY (user_id, subscription_id)
);
ALTER TABLE ai_royale_private.polar_subscription_lifecycles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_royale_private.polar_subscription_lifecycles FROM PUBLIC, anon, authenticated, service_role;

-- Legacy receipts contain ingestion time but no signed delivery ID or resource clock.
CREATE VIEW ai_royale_private.confirmed_legacy_polar_ends AS
SELECT DISTINCT e.user_id, e.event_id AS subscription_id
FROM public.webhook_events e JOIN auth.users u ON u.id=e.user_id
WHERE e.status='processed' AND e.event_type IN ('subscription.revoked','subscription.ended')
  AND e.event_id IS NOT NULL AND e.payload_summary->>'webhookId' IS NULL AND (
    EXISTS (SELECT FROM public.user_subscriptions s WHERE s.user_id=e.user_id AND s.polar_subscription_id=e.event_id)
    OR EXISTS (SELECT FROM public.polar_orders o WHERE o.user_id=e.user_id AND o.subscription_id=e.event_id)
  );
REVOKE ALL ON ai_royale_private.confirmed_legacy_polar_ends FROM PUBLIC, anon, authenticated, service_role;

-- Used by this transaction and by the operator once the old Edge revision has drained.
CREATE FUNCTION ai_royale_private.seed_polar_subscription_ends()
RETURNS TABLE (inserted bigint, marked_ended bigint, repaired bigint)
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE january_fingerprint constant bytea := decode('0119da79ca387850e603a8ae1eda8f07ceb87768c3056389caba3cb72510d541','hex');
BEGIN
  LOCK TABLE public.user_subscriptions IN EXCLUSIVE MODE NOWAIT;
  LOCK TABLE public.webhook_events IN SHARE ROW EXCLUSIVE MODE NOWAIT;

  INSERT INTO ai_royale_private.polar_subscription_lifecycles(user_id,subscription_id,closed_reason)
    SELECT e.user_id,e.subscription_id,'ended' FROM ai_royale_private.confirmed_legacy_polar_ends e
    ON CONFLICT (user_id,subscription_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  -- A row that already holds provider creation evidence must also acquire its end marker.
  UPDATE ai_royale_private.polar_subscription_lifecycles c SET closed_reason='ended'
    FROM ai_royale_private.confirmed_legacy_polar_ends e
    WHERE c.user_id=e.user_id AND c.subscription_id=e.subscription_id AND c.closed_reason IS DISTINCT FROM 'ended';
  GET DIAGNOSTICS marked_ended = ROW_COUNT;

  IF EXISTS (
    SELECT FROM public.user_subscriptions s JOIN ai_royale_private.polar_subscription_lifecycles c
      ON c.user_id=s.user_id AND c.subscription_id=s.polar_subscription_id
    WHERE c.closed_reason='ended' AND s.status IN ('active','trialing')
  ) THEN
    RAISE EXCEPTION 'Confirmed Polar end matches an active or trialing local subscription; reconcile before rollout' USING ERRCODE='23514';
  END IF;

  -- Only the provider-confirmed 14 January 2026 end, also referenced by the January repair.
  -- Match the resource fingerprint and current facts. Preserve orders, receipts and provider clocks.
  UPDATE public.user_subscriptions s SET status='expired', account_slots=0, updated_at=now()
    FROM ai_royale_private.polar_subscription_lifecycles c
    WHERE c.user_id=s.user_id AND c.subscription_id=s.polar_subscription_id AND c.closed_reason='ended'
      AND sha256(convert_to(s.polar_subscription_id,'UTF8'))=january_fingerprint
      AND s.status='cancelled' AND s.account_slots>0 AND NOT public.marketing_subscription_access(s.user_id)
      AND NOT EXISTS (SELECT FROM public.player_profiles p WHERE p.user_id=s.user_id AND p.ai_enabled);
  GET DIAGNOSTICS repaired = ROW_COUNT;
  IF EXISTS (
    SELECT FROM public.user_subscriptions s WHERE s.status='cancelled' AND s.account_slots>0
      AND sha256(convert_to(s.polar_subscription_id,'UTF8'))=january_fingerprint
  ) THEN
    RAISE EXCEPTION 'January repair no longer matches its verified end or entitlement checks. Reconcile before rollout.' USING ERRCODE='23514';
  END IF;
  RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION ai_royale_private.seed_polar_subscription_ends() FROM PUBLIC, anon, authenticated, service_role;
SELECT * FROM ai_royale_private.seed_polar_subscription_ends();

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
  previous_resource_start timestamptz;
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
    -- Pin a real owner through the transaction. A completed deletion cannot recreate billing.
    PERFORM 1 FROM auth.users WHERE id=p_user_id FOR KEY SHARE;
    IF NOT FOUND THEN decision := 'pending_unknown_user'; END IF;
  END IF;

  IF decision IS NULL THEN
    IF NOT EXISTS (SELECT FROM public.profiles WHERE id=p_user_id) THEN
      RAISE EXCEPTION 'Subscriber profile unavailable' USING ERRCODE='40001';
    END IF;
    SELECT * INTO previous FROM public.user_subscriptions WHERE user_id=p_user_id FOR UPDATE;
    -- Different resources have independent modification clocks. A late end on the old
    -- resource can have a later timestamp than the purchase that replaced it.
    SELECT provider_created_at INTO previous_resource_start FROM ai_royale_private.polar_subscription_lifecycles
      WHERE user_id=p_user_id AND subscription_id=previous.polar_subscription_id;
    replacement_allowed := CASE
      WHEN previous.polar_subscription_id IS NULL THEN true
      WHEN previous_resource_start IS NOT NULL AND resource_start IS NOT NULL
        THEN resource_start>previous_resource_start
      ELSE previous.last_event_at IS NULL OR coalesce(resource_start,p_event_at)>previous.last_event_at
    END;

    IF NOT terminal THEN
      -- An old worker may have recorded an end after the first seed and before this delivery.
      INSERT INTO ai_royale_private.polar_subscription_lifecycles AS c (user_id,subscription_id,closed_reason)
        SELECT e.user_id,e.subscription_id,'ended' FROM ai_royale_private.confirmed_legacy_polar_ends e
        WHERE e.user_id=p_user_id AND e.subscription_id=p_subscription_id
        ON CONFLICT (user_id,subscription_id) DO UPDATE SET closed_reason='ended'
          WHERE c.closed_reason IS DISTINCT FROM 'ended';
    END IF;

    IF terminal THEN
      SELECT NOT EXISTS (SELECT FROM ai_royale_private.polar_subscription_lifecycles
        WHERE user_id=p_user_id AND subscription_id=p_subscription_id AND closed_reason='ended') INTO first_end;
      closed_at := greatest(p_event_at, CASE WHEN previous.polar_subscription_id=p_subscription_id THEN previous.last_event_at END);
      INSERT INTO ai_royale_private.polar_subscription_lifecycles AS c
        (user_id,subscription_id,closed_reason,last_event_at,provider_created_at) VALUES (p_user_id,p_subscription_id,'ended',closed_at,resource_start)
      ON CONFLICT (user_id,subscription_id) DO UPDATE SET closed_reason='ended',last_event_at=greatest(c.last_event_at,excluded.last_event_at),
        provider_created_at=coalesce(c.provider_created_at,excluded.provider_created_at)
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
    ELSIF EXISTS (SELECT FROM ai_royale_private.polar_subscription_lifecycles WHERE user_id=p_user_id AND subscription_id=p_subscription_id AND closed_reason IS NOT NULL) THEN
      decision := 'closed_id';
    ELSIF previous.polar_subscription_id=p_subscription_id AND previous.status='expired' AND previous.account_slots=0 THEN
      -- The old handler commits the end before writing its separate receipt.
      decision := 'pending_unconfirmed_end';
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
      UPDATE public.user_subscriptions SET last_event_at=greatest(last_event_at,p_event_at)
      WHERE user_id=p_user_id AND polar_subscription_id=p_subscription_id
        AND (last_event_at IS NULL OR last_event_at<p_event_at);
      decision := 'duplicate';
    ELSIF p_kind='subscription.past_due' THEN
      UPDATE public.user_subscriptions SET status='past_due', last_event_at=p_event_at, updated_at=now()
      WHERE user_id=p_user_id AND polar_subscription_id=p_subscription_id AND (last_event_at IS NULL OR last_event_at<=p_event_at);
      decision := CASE WHEN FOUND THEN 'applied' ELSE 'stale' END;
    ELSE
      INSERT INTO public.user_subscriptions AS s (user_id,polar_subscription_id,polar_customer_id,polar_customer_external_id,
        status,variant_id,account_slots,current_period_start,current_period_end,cancel_at_period_end,canceled_at,ends_at,last_event_at)
      SELECT p_user_id,p_subscription_id,p_fields->>'customer_id',p_user_id::text,
        incoming_status,p_fields->>'product_id',coalesce(slots,1),period_start,period_end,
        coalesce((p_fields->>'cancel_at_period_end')::boolean,false),(p_fields->>'canceled_at')::timestamptz,
        (p_fields->>'ends_at')::timestamptz,p_event_at
      WHERE NOT EXISTS (SELECT FROM ai_royale_private.polar_subscription_lifecycles WHERE user_id=p_user_id AND subscription_id=p_subscription_id AND closed_reason IS NOT NULL)
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
        last_event_at=excluded.last_event_at,updated_at=now()
      WHERE (s.polar_subscription_id IS NOT DISTINCT FROM p_subscription_id AND (s.last_event_at IS NULL OR s.last_event_at<=excluded.last_event_at))
         OR (s.polar_subscription_id IS DISTINCT FROM p_subscription_id AND full_update AND replacement_allowed);
      IF FOUND THEN
        decision := CASE WHEN previous.id IS NULL THEN 'created' ELSE 'applied' END;
        IF previous.polar_subscription_id IS NOT NULL AND previous.polar_subscription_id<>p_subscription_id THEN
          INSERT INTO ai_royale_private.polar_subscription_lifecycles AS c
            (user_id,subscription_id,closed_reason,last_event_at) VALUES (p_user_id,previous.polar_subscription_id,'replaced',previous.last_event_at)
          ON CONFLICT (user_id,subscription_id) DO UPDATE SET closed_reason='replaced',last_event_at=greatest(c.last_event_at,excluded.last_event_at)
          WHERE c.closed_reason IS NULL;
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

  IF NOT terminal AND resource_start IS NOT NULL AND decision IN ('created','applied','duplicate') THEN
    INSERT INTO ai_royale_private.polar_subscription_lifecycles AS c (user_id,subscription_id,provider_created_at)
      VALUES (p_user_id,p_subscription_id,resource_start)
    ON CONFLICT (user_id,subscription_id) DO UPDATE SET provider_created_at=excluded.provider_created_at
      WHERE c.provider_created_at IS NULL AND c.closed_reason IS NULL;
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
  VALUES (p_kind,p_subscription_id,CASE WHEN decision='pending_unknown_user' THEN NULL ELSE p_user_id END,
    CASE WHEN decision LIKE 'pending%' THEN 'pending' WHEN decision IN ('created','applied','ended','recorded_end') THEN 'processed' ELSE 'skipped' END,
    CASE WHEN decision IN ('created','applied','ended') THEN NULL ELSE decision END, summary);
  RETURN decision;
END $$;

REVOKE ALL ON FUNCTION public.apply_polar_subscription_event(uuid,text,text,timestamptz,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_polar_subscription_event(uuid,text,text,timestamptz,text,jsonb) TO service_role;

-- The same unbounded backlog count powers the operator panel and the scheduled alarm.
CREATE FUNCTION ai_royale_private.overdue_polar_receipts() RETURNS bigint
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT count(*) FROM public.webhook_events WHERE status='pending' AND created_at<=now()-interval '1 hour'
$$;
REVOKE ALL ON FUNCTION ai_royale_private.overdue_polar_receipts() FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admin_polar_webhook_health()
RETURNS TABLE (window_name text, total bigint, processed bigint, failed bigint, skipped bigint, pending bigint, overdue_pending bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM public.admin_roles WHERE user_id=auth.uid() AND role IN ('admin','moderator')) THEN
    RAISE EXCEPTION 'Operator access required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT w.label,count(e.id),count(*) FILTER (WHERE e.status='processed'),
    count(*) FILTER (WHERE e.status='failed'),count(*) FILTER (WHERE e.status='skipped'),
    count(*) FILTER (WHERE e.status='pending'),ai_royale_private.overdue_polar_receipts()
  FROM (VALUES ('last24h',interval '24 hours'),('last7d',interval '7 days')) w(label,span)
  LEFT JOIN public.webhook_events e ON e.created_at>=now()-w.span
  GROUP BY w.label;
END $$;
REVOKE ALL ON FUNCTION public.admin_polar_webhook_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_polar_webhook_health() TO authenticated;

CREATE FUNCTION ai_royale_private.check_polar_pending_age() RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE n bigint := ai_royale_private.overdue_polar_receipts();
BEGIN
  IF n>0 THEN
    -- pg_cron persists the failed check and its aggregate reason in job_run_details.
    RAISE EXCEPTION 'polar_pending_overdue: % unresolved receipt(s) at least one hour old', n;
  END IF;
END $$;
REVOKE ALL ON FUNCTION ai_royale_private.check_polar_pending_age() FROM PUBLIC, anon, authenticated, service_role;
SELECT cron.schedule('polar-pending-age','*/5 * * * *','SELECT ai_royale_private.check_polar_pending_age()');
NOTIFY pgrst,'reload schema';
