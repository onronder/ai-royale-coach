-- Synthetic operators and player links in the disposable PostgreSQL database.
CREATE FUNCTION boundary_fixture.polar_event(n int, sub text, kind text, event_second int, state text DEFAULT 'active', resource_second int DEFAULT NULL)
RETURNS text LANGUAGE sql AS $$
  SELECT public.apply_polar_subscription_event(boundary_fixture.account(n),sub,'subscription.'||kind,
    timestamptz '2026-01-01 12:00:00+00' + event_second * interval '1 second',
    'delivery-'||n||'-'||kind||'-'||event_second,
    jsonb_build_object('provider_created_at',timestamptz '2026-01-01 12:00:00+00' + resource_second * interval '1 second',
      'provider_status',state,'status',state,'account_slots',2,'product_id','two',
      'cancel_at_period_end',kind='canceled','ends_at',CASE WHEN kind='canceled' THEN now()+interval '1 month' END,
      'current_period_start',now()-interval '1 day','current_period_end',now()+interval '1 month'))
$$;
CREATE FUNCTION boundary_fixture.check_polar(n int, sub text, state text, capacity int, enabled int, access boolean, stamp int)
RETURNS void LANGUAGE sql AS $$
  SELECT boundary_fixture.check_that(EXISTS (
    SELECT FROM public.user_subscriptions s JOIN public.profiles u ON u.id=s.user_id
    WHERE s.user_id=boundary_fixture.account(n) AND s.polar_subscription_id=sub AND s.status=state
      AND s.account_slots=capacity AND public.marketing_subscription_access(s.user_id)=access
      AND s.last_event_at=timestamptz '2026-01-01 12:00:00+00' + stamp * interval '1 second'
      AND u.trial_used AND (SELECT count(*) FROM public.player_profiles p WHERE p.user_id=s.user_id AND p.ai_enabled)=enabled
  ), 'subscription, trial state, access, slot count, profile flags and watermark for test '||n)
$$;
INSERT INTO auth.users(id,email) SELECT boundary_fixture.account(n), 'polar'||n||'@example.invalid' FROM generate_series(301,316) n;
INSERT INTO public.player_profiles(user_id,player_tag)
  SELECT boundary_fixture.account(n),tag FROM generate_series(301,316) n CROSS JOIN (VALUES ('#22PP'),('#22YY')) tags(tag);
SELECT boundary_fixture.polar_event(n,'old-'||n,'active',10) FROM generate_series(301,309) n;
SELECT boundary_fixture.check_polar(n,'old-'||n,'active',2,2,true,10) FROM generate_series(301,309) n;

DO $$
DECLARE scenario RECORD; result text;
BEGIN
  FOR scenario IN SELECT * FROM (VALUES
    (301,'revoked','updated',15),(302,'ended','updated',20),(303,'revoked','uncanceled',25),
    (304,'ended','active',30),(305,'revoked','created',30),(306,'revoked','past_due',25)
  ) t(n,ending,late_kind,stamp) LOOP
    PERFORM boundary_fixture.check_that(boundary_fixture.polar_event(scenario.n,'old-'||scenario.n,scenario.ending,20)='ended','first end');
    result := boundary_fixture.polar_event(scenario.n,'old-'||scenario.n,scenario.late_kind,scenario.stamp);
    PERFORM boundary_fixture.check_that(result='closed_id',scenario.late_kind||' on closed resource');
    PERFORM boundary_fixture.check_polar(scenario.n,'old-'||scenario.n,'expired',0,0,false,20);
  END LOOP;
END $$;
-- A later watermark is preserved even if the provider delivers its final event late.
SELECT boundary_fixture.polar_event(307,'old-307','updated',40);
SELECT boundary_fixture.polar_event(307,'old-307','revoked',20);
SELECT boundary_fixture.check_polar(307,'old-307','expired',0,0,false,40);
SELECT boundary_fixture.check_that(boundary_fixture.polar_event(307,'old-307','ended',50)='duplicate','duplicate terminal notice');
SELECT boundary_fixture.check_polar(307,'old-307','expired',0,0,false,50);

-- A genuinely new subscription can activate both links. The old resource stays closed.
SELECT boundary_fixture.polar_event(301,'new-301','created',30);
SELECT boundary_fixture.polar_event(301,'old-301','updated',40);
SELECT boundary_fixture.polar_event(301,'old-301','ended',50);
SELECT boundary_fixture.check_polar(301,'new-301','active',2,2,true,30);
-- A terminal delivery before any start also survives a later active delivery.
SELECT boundary_fixture.check_that(boundary_fixture.polar_event(310,'ended-first','revoked',20)='recorded_end','end before start');
SELECT boundary_fixture.check_that(boundary_fixture.polar_event(310,'ended-first','active',10)='closed_id','delayed start');
SELECT boundary_fixture.check_that(NOT EXISTS(SELECT FROM public.user_subscriptions WHERE user_id=boundary_fixture.account(310)),'no phantom entitlement');
-- Turning off future renewal and resuming it before expiry is still supported.
SELECT boundary_fixture.polar_event(311,'open','created',10);
SELECT boundary_fixture.polar_event(311,'open','canceled',20);
SELECT boundary_fixture.check_that((SELECT cancel_at_period_end AND public.marketing_subscription_access(user_id)
  FROM public.user_subscriptions WHERE user_id=boundary_fixture.account(311)),'paid-through scheduled cancellation');
SELECT boundary_fixture.polar_event(311,'open','uncanceled',30);
SELECT boundary_fixture.check_that((SELECT NOT cancel_at_period_end AND ends_at IS NULL FROM public.user_subscriptions
  WHERE user_id=boundary_fixture.account(311)),'renewal restored before end');
SELECT boundary_fixture.check_polar(311,'open','active',2,2,true,30);

-- A newer resource was purchased before a delayed end on the old one.
SELECT boundary_fixture.polar_event(316,'previous','created',10,'active',5);
SELECT boundary_fixture.polar_event(316,'previous','revoked',50,'expired',5);
SELECT boundary_fixture.check_that(boundary_fixture.polar_event(316,'replacement','created',30,'active',25)='applied','distinct provider clocks');
SELECT boundary_fixture.check_polar(316,'replacement','active',2,2,true,30);
-- A late update for an unseen older purchase cannot displace the current lifecycle.
SELECT boundary_fixture.check_that(boundary_fixture.polar_event(316,'older','updated',60,'active',1)='pending_subscription_order','older resource');
SELECT boundary_fixture.check_polar(316,'replacement','active',2,2,true,30);
SELECT boundary_fixture.polar_event(n,'old-'||n,'active',10) FROM generate_series(312,315) n;

SELECT boundary_fixture.check_that(NOT has_function_privilege('authenticated',
  'public.apply_polar_subscription_event(uuid,text,text,timestamptz,text,jsonb)','EXECUTE')
  AND NOT has_function_privilege('anon','public.apply_polar_subscription_event(uuid,text,text,timestamptz,text,jsonb)','EXECUTE')
  AND has_function_privilege('service_role','public.apply_polar_subscription_event(uuid,text,text,timestamptz,text,jsonb)','EXECUTE'),
  'billing writer is service-only');
