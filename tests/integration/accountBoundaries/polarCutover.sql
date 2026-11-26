-- Synthetic accounts in a disposable database; the provider-confirmed January resource
-- is supplied by the runner from its original, already versioned migration.
INSERT INTO auth.users(id,email) SELECT boundary_fixture.account(n),'cutover'||n||'@example.invalid' FROM generate_series(401,407) n;
INSERT INTO public.user_subscriptions(user_id,polar_subscription_id,status,account_slots,last_event_at)
VALUES (boundary_fixture.account(401),current_setting('fixture.january_resource'),'cancelled',2,'2026-01-21T18:08:01Z'),
       (boundary_fixture.account(402),'other-cancelled','cancelled',2,'2026-01-21T18:08:01Z'),
       (boundary_fixture.account(403),'gap','expired',0,'2026-01-01T12:00:01Z');
INSERT INTO public.webhook_events(user_id,event_id,event_type,status)
SELECT boundary_fixture.account(n),s,'subscription.revoked','processed' FROM (VALUES
  (401,current_setting('fixture.january_resource')),(402,'other-cancelled')) v(n,s);
INSERT INTO ai_royale_private.polar_subscription_lifecycles(user_id,subscription_id,provider_created_at)
  VALUES (boundary_fixture.account(401),current_setting('fixture.january_resource'),'2026-01-11T00:00:00Z');

DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM ai_royale_private.seed_polar_subscription_ends();
  PERFORM boundary_fixture.check_that(r.inserted>=1 AND r.marked_ended>=1 AND r.repaired=1,'proven January repair');
  PERFORM boundary_fixture.check_that(EXISTS (SELECT FROM public.user_subscriptions WHERE user_id=boundary_fixture.account(401)
    AND status='expired' AND account_slots=0 AND last_event_at='2026-01-21T18:08:01Z'),'preserve resource clock on repair');
  PERFORM boundary_fixture.check_that(EXISTS (SELECT FROM ai_royale_private.polar_subscription_lifecycles WHERE user_id=boundary_fixture.account(401)
    AND closed_reason='ended' AND provider_created_at='2026-01-11T00:00:00Z' AND last_event_at IS NULL),'preserve earlier evidence');
  PERFORM boundary_fixture.check_that(EXISTS (SELECT FROM public.user_subscriptions WHERE user_id=boundary_fixture.account(402)
    AND status='cancelled' AND account_slots=2),'leave other cancelled subscriptions intact');
  SELECT * INTO r FROM ai_royale_private.seed_polar_subscription_ends();
  PERFORM boundary_fixture.check_that(r.inserted=0 AND r.marked_ended=0 AND r.repaired=0,'repeat seed is a no-op');

  PERFORM boundary_fixture.check_that(boundary_fixture.polar_event(403,'gap','updated',10)='pending_unconfirmed_end','legacy end waiting for receipt');
  INSERT INTO public.webhook_events(user_id,event_id,event_type,status) VALUES (boundary_fixture.account(403),'gap','subscription.revoked','processed');
  PERFORM boundary_fixture.check_that(boundary_fixture.polar_event(403,'gap','updated',11)='closed_id','late legacy receipt protects immediately');
  PERFORM boundary_fixture.check_that(EXISTS (SELECT FROM public.user_subscriptions WHERE user_id=boundary_fixture.account(403)
    AND status='expired' AND account_slots=0 AND last_event_at='2026-01-01T12:00:01Z'),'legacy window never reopens access');

  DELETE FROM auth.users WHERE id=boundary_fixture.account(404);
  PERFORM boundary_fixture.check_that(boundary_fixture.polar_event(404,'deleted','revoked',15)='pending_unknown_user','deleted owner acknowledged');
  PERFORM boundary_fixture.check_that(boundary_fixture.polar_event(408,'never-existed','updated',15)='pending_unknown_user','absent owner acknowledged');
  PERFORM boundary_fixture.check_that((SELECT count(*)=2 FROM public.webhook_events WHERE event_id IN ('deleted','never-existed')
    AND user_id IS NULL AND status='pending' AND error_message='pending_unknown_user'),'durable private outcomes');
  DELETE FROM public.profiles WHERE id=boundary_fixture.account(405);
  BEGIN
    PERFORM boundary_fixture.polar_event(405,'profile-creating','created',10);
    RAISE EXCEPTION 'Expected transient missing profile';
  EXCEPTION WHEN serialization_failure THEN NULL;
  END;
  PERFORM boundary_fixture.check_that(NOT EXISTS(SELECT FROM public.webhook_events WHERE event_id='profile-creating'),'temporary failure rolls back');
  INSERT INTO public.profiles(id,email) VALUES (boundary_fixture.account(405),'cutover405@example.invalid');
  PERFORM boundary_fixture.check_that(boundary_fixture.polar_event(405,'profile-creating','created',10)='created','retry after signup');

  INSERT INTO public.webhook_events(event_type,event_id,status,created_at) VALUES
    ('subscription.updated','alarm-old','pending',now()-interval '10 days'),
    ('subscription.updated','alarm-young','pending',now()-interval '5 minutes');
  BEGIN
    PERFORM ai_royale_private.check_polar_pending_age();
    RAISE EXCEPTION 'Missing expected overdue-alarm signal' USING ERRCODE='22000';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'polar_pending_overdue:%' THEN RAISE; END IF;
  END;
  INSERT INTO public.admin_roles(user_id,role) VALUES (boundary_fixture.account(407),'moderator');
  PERFORM set_config('request.jwt.claim.sub',boundary_fixture.account(406)::text,true);
  BEGIN
    PERFORM public.admin_polar_webhook_health();
    RAISE EXCEPTION 'Expected operator restriction';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub',boundary_fixture.account(407)::text,true);
  PERFORM boundary_fixture.check_that(EXISTS (SELECT FROM public.admin_polar_webhook_health()
    WHERE window_name='last24h' AND pending>=3 AND overdue_pending>=1),'moderator can see all-age backlog');
  UPDATE public.webhook_events SET status='resolved' WHERE event_id='alarm-old';
  PERFORM ai_royale_private.check_polar_pending_age();
END $$;
