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
DECLARE r record; old_id uuid; task uuid; token uuid; scanned uuid;
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
  INSERT INTO vault.decrypted_secrets(name,decrypted_secret) VALUES ('project_url','https://fixture.invalid'),('anon_key','fixture');
  INSERT INTO cron.job_run_details VALUES ((SELECT jobid FROM cron.job WHERE jobname='polar-pending-age'),now()-interval '15 days'),
      ((SELECT jobid FROM cron.job WHERE jobname='polar-pending-age'),now()-interval '1 day'),(-5,now()-interval '30 days');
  PERFORM ai_royale_private.check_polar_pending_age();
  PERFORM ai_royale_private.check_polar_pending_age();
  PERFORM boundary_fixture.check_that((SELECT count(*)=2 FROM ai_royale_private.polar_operations),'one incident and one daily scan');
  PERFORM boundary_fixture.check_that((SELECT count(*)=2 FROM cron.job_run_details),'retain recent monitor runs and other jobs');
  SELECT id INTO old_id FROM public.webhook_events WHERE event_id='alarm-old';
  SELECT id,ticket INTO task,token FROM ai_royale_private.polar_operations WHERE kind='overdue';
  PERFORM boundary_fixture.check_that(EXISTS(SELECT FROM public.claim_polar_operation(token) WHERE id=task AND overdue_count=1),'valid alert ticket');
  PERFORM boundary_fixture.check_that(NOT EXISTS(SELECT FROM public.claim_polar_operation(token)),'ticket cannot be reused');
  UPDATE ai_royale_private.polar_operations SET queued_at=now()-interval '11 minutes' WHERE id=task;
  PERFORM ai_royale_private.check_polar_pending_age();
  PERFORM boundary_fixture.check_that(NOT public.finish_polar_operation(token,'{}'),'old lease cannot acknowledge');
  SELECT ticket INTO token FROM ai_royale_private.polar_operations WHERE id=task;
  PERFORM boundary_fixture.check_that(EXISTS(SELECT FROM public.claim_polar_operation(token) WHERE id=task),'retry reuses immutable task id');
  PERFORM boundary_fixture.check_that(public.finish_polar_operation(token,'{"accepted":3}'),'acknowledge alert');
  SELECT ticket INTO scanned FROM ai_royale_private.polar_operations WHERE kind='overlap';
  PERFORM boundary_fixture.check_that(EXISTS(SELECT FROM public.claim_polar_operation(scanned)),'independent overlap task');
  PERFORM boundary_fixture.check_that(public.finish_polar_operation(scanned,'{"customers_with_multiple_active_subscriptions":0}'),'save daily scan');
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
  BEGIN
    PERFORM public.admin_resolve_polar_receipt(old_id,'Reviewed');
    RAISE EXCEPTION 'Moderator resolved a receipt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.admin_roles(user_id,role) VALUES (boundary_fixture.account(406),'admin');
  PERFORM set_config('request.jwt.claim.sub',boundary_fixture.account(406)::text,true);
  BEGIN
    PERFORM public.admin_resolve_polar_receipt(old_id,E' \t');
    RAISE EXCEPTION 'Empty note accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM boundary_fixture.check_that(public.admin_resolve_polar_receipt(old_id,' Provider end confirmed '),'administrator resolved receipt');
  PERFORM boundary_fixture.check_that(NOT public.admin_resolve_polar_receipt(old_id,'Repeat'),'repeated resolution leaves existing audit intact');
  PERFORM boundary_fixture.check_that((SELECT count(*)=1 FROM public.admin_audit_log WHERE action='resolve_polar_receipt'
    AND admin_id=boundary_fixture.account(406) AND details->>'receipt_id'=old_id::text AND details->>'note'='Provider end confirmed'),'audited note and actor');
  PERFORM ai_royale_private.check_polar_pending_age();
  PERFORM boundary_fixture.check_that((SELECT count(*)=1 FROM ai_royale_private.polar_operations WHERE kind='recovered'),'deliver one recovery');
  PERFORM ai_royale_private.check_polar_pending_age();
END $$;
