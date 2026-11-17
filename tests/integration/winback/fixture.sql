-- Three expired win-back accounts (2, 3, 4) with granted campaign consent; account 1 has no history at all.
INSERT INTO public.user_subscriptions(user_id,polar_subscription_id,status,current_period_start,current_period_end)
  SELECT id,'wb'||right(id::text,1),'trialing',trial_started_at,trial_ends_at FROM public.profiles
  WHERE id IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004');
INSERT INTO public.chat_messages SELECT user_id,ends_at-interval '1 hour','user' FROM public.trial_conversion_periods;
INSERT INTO public.webhook_events SELECT user_id,subscription_id,'subscription.canceled','processed',started_at+interval '2 hours' FROM public.trial_conversion_periods;
UPDATE public.user_subscriptions SET status='expired' WHERE polar_subscription_id LIKE 'wb%';
UPDATE auth.users SET email_confirmed_at=now();
UPDATE public.marketing_settings SET sending_enabled=true, approved_markets='{global}', age_rule_approved=true, require_iys=false;
INSERT INTO public.marketing_consent_events(user_id,email,event,source,text_version,language,request_key)
  SELECT id,email,'granted','preferences','2026-11-v1','tr','fixture:'||id FROM auth.users;
