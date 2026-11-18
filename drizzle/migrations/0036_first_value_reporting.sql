-- All figures and drill-downs use this same account-grain relation and as-of time.
CREATE FUNCTION public.first_value_cohort(p_cohort text,p_from date,p_to date,p_at timestamptz)
RETURNS TABLE(user_id uuid,email text,cohort text,anchor_at timestamptz,steps jsonb,feedback text,
 trial_at timestamptz,paid_at timestamptz,undated_payment boolean,renewal_at timestamptz,
 ai_calls bigint,input_tokens bigint,output_tokens bigint,unknown_cost_calls bigint,uncertain_calls bigint,cost_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH cfg AS (SELECT launched_at FROM public.first_value_settings WHERE singleton),
 accounts AS (
  SELECT u.id,u.email::text,coalesce(a.cohort,'new') AS cohort,
   coalesce(a.anchor_at,u.email_confirmed_at) AS anchor,a.feedback
  FROM auth.users u CROSS JOIN cfg LEFT JOIN public.first_value_accounts a ON a.user_id=u.id
  WHERE cfg.launched_at IS NOT NULL AND (a.user_id IS NOT NULL OR (u.created_at>=cfg.launched_at AND u.email_confirmed_at IS NOT NULL))
   AND NOT EXISTS(SELECT 1 FROM public.admin_roles r WHERE r.user_id=u.id)
   AND NOT EXISTS(SELECT 1 FROM public.trial_test_accounts t WHERE t.user_id=u.id)
 ), selected AS (
  SELECT * FROM accounts a WHERE (p_cohort IS NULL OR a.cohort=p_cohort) AND a.anchor<=p_at
   AND (p_from IS NULL OR a.anchor >= p_from::timestamp AT TIME ZONE 'Europe/Istanbul')
   AND (p_to IS NULL OR a.anchor < (p_to+1)::timestamp AT TIME ZONE 'Europe/Istanbul')
 )
 SELECT a.id,a.email,a.cohort,a.anchor,
  coalesce((SELECT jsonb_object_agg(step,created_at) FROM public.first_value_events e WHERE e.user_id=a.id AND e.created_at<=p_at),'{}') ||
  coalesce((SELECT jsonb_object_agg(step,created_at) FROM public.acquisition_events e WHERE e.user_id=a.id AND e.created_at BETWEEN a.anchor AND p_at),'{}'),
  a.feedback,r.trial_start,r.first_paid_at,r.undated_payment,r.first_renewal_at,
  calls.n,calls.inputs,calls.outputs,calls.unknown,calls.uncertain,calls.cost
 FROM selected a
 LEFT JOIN public.revenue_cohort(NULL,NULL,true,p_at) r ON r.user_id=a.id
 LEFT JOIN LATERAL (SELECT count(*) AS n,sum(c.input_tokens)::bigint AS inputs,sum(c.output_tokens)::bigint AS outputs,
  count(*) FILTER(WHERE c.cost_usd IS NULL) AS unknown,count(*) FILTER(WHERE c.status='uncertain') AS uncertain,
  CASE WHEN count(*) FILTER(WHERE c.cost_usd IS NULL)=0 THEN coalesce(sum(c.cost_usd),0) END AS cost
  FROM public.first_value_calls c WHERE c.user_id=a.id AND c.started_at<=p_at) calls ON true
$$;
REVOKE ALL ON FUNCTION public.first_value_cohort(text,date,date,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.first_value_metric(p_row jsonb,p_metric text,p_at timestamptz) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE p_metric
 WHEN 'accounts' THEN true
 WHEN 'mature14' THEN NOT coalesce((p_row->>'undated_payment')::boolean,false) AND (p_row->>'anchor_at')::timestamptz+interval '14 days'<=p_at
 WHEN 'paid14' THEN NOT coalesce((p_row->>'undated_payment')::boolean,false) AND (p_row->>'anchor_at')::timestamptz+interval '14 days'<=p_at AND (p_row->>'paid_at')::timestamptz >= (p_row->>'anchor_at')::timestamptz AND (p_row->>'paid_at')::timestamptz < (p_row->>'anchor_at')::timestamptz+interval '14 days'
 WHEN 'pending14' THEN (p_row->>'anchor_at')::timestamptz+interval '14 days'>p_at
 WHEN 'undated_payment' THEN (p_row->>'undated_payment')::boolean
 WHEN 'trial_started' THEN (p_row->>'trial_at')::timestamptz >= (p_row->>'anchor_at')::timestamptz
 WHEN 'first_paid' THEN (p_row->>'paid_at')::timestamptz >= (p_row->>'anchor_at')::timestamptz
 WHEN 'uncertain' THEN (p_row->>'uncertain_calls')::bigint>0
 WHEN 'responded' THEN p_row->>'feedback' IS NOT NULL
 WHEN 'unknown_reason' THEN p_row->>'feedback' IS NULL
 WHEN 'mature45' THEN (p_row->>'paid_at')::timestamptz+interval '45 days'<=p_at
 WHEN 'renewed45' THEN (p_row->>'paid_at')::timestamptz+interval '45 days'<=p_at AND (p_row->>'renewal_at')::timestamptz<(p_row->>'paid_at')::timestamptz+interval '45 days'
 ELSE (p_row->'steps') ? p_metric END
$$;
REVOKE ALL ON FUNCTION public.first_value_metric(jsonb,text,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.admin_first_value_report(p_cohort text DEFAULT 'new',p_from date DEFAULT NULL,p_to date DEFAULT NULL,p_at timestamptz DEFAULT now(),p_metric text DEFAULT 'accounts',p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE rows jsonb; counts jsonb; details jsonb; total bigint; revenue jsonb; costs jsonb; reasons jsonb; errors jsonb;
 metrics text[]:=ARRAY['accounts','screen_seen','tag_help','tag_found','requested','generated','viewed','matched','offer_seen','declined','trial_start_clicked','pricing_shown','polar_continue_clicked','checkout_created','trial_started','first_paid','mature14','paid14','pending14','undated_payment','responded','unknown_reason','uncertain','mature45','renewed45'];
BEGIN
 IF NOT coalesce(public.is_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF p_cohort IS NULL OR p_cohort NOT IN ('new','returning') OR p_metric IS NULL OR NOT p_metric=ANY(metrics) OR p_at IS NULL OR p_at>now()+interval '1 minute' OR p_from>p_to THEN RAISE EXCEPTION 'Invalid report filter'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') INTO rows FROM public.first_value_cohort(p_cohort,p_from,p_to,p_at)c;
 SELECT jsonb_object_agg(metric,(SELECT count(*) FROM jsonb_array_elements(rows)r WHERE public.first_value_metric(r,metric,p_at))) INTO counts FROM unnest(metrics)metric;
 SELECT count(*) INTO total FROM jsonb_array_elements(rows)r WHERE public.first_value_metric(r,p_metric,p_at);
 SELECT coalesce(jsonb_agg(r),'[]') INTO details FROM (
  SELECT r FROM jsonb_array_elements(rows)r WHERE public.first_value_metric(r,p_metric,p_at) ORDER BY r->>'anchor_at' DESC,r->>'user_id' LIMIT 25 OFFSET greatest(0,p_offset)
 )page;
 SELECT coalesce(jsonb_object_agg(reason,n),'{}') INTO reasons FROM (
  SELECT r->>'feedback' AS reason,count(*) AS n FROM jsonb_array_elements(rows)r WHERE r->>'feedback' IS NOT NULL GROUP BY 1
 )groups;
 SELECT jsonb_build_object('calls',coalesce(sum((r->>'ai_calls')::bigint),0),'input_tokens',sum((r->>'input_tokens')::bigint),
  'output_tokens',sum((r->>'output_tokens')::bigint),'unknown_cost_calls',coalesce(sum((r->>'unknown_cost_calls')::bigint),0),
  'cost_usd',CASE WHEN coalesce(sum((r->>'unknown_cost_calls')::bigint),0)=0 THEN coalesce(sum((r->>'cost_usd')::numeric),0) END)
 INTO costs FROM jsonb_array_elements(rows)r;
 -- Only mature 30-day windows; undated positive orders remain explicit, never silently zeroed.
 WITH mature AS (SELECT r FROM jsonb_array_elements(rows)r WHERE (r->>'anchor_at')::timestamptz+interval '30 days'<=p_at),
 amounts AS (
  SELECT o.currency,sum(public.polar_positive_net(o.status,o.amount,o.refunded_net_cents)) AS cents
  FROM mature m JOIN public.polar_orders o ON o.user_id=(m.r->>'user_id')::uuid
  WHERE o.paid_at >= (m.r->>'anchor_at')::timestamptz AND o.paid_at < (m.r->>'anchor_at')::timestamptz+interval '30 days'
   AND o.currency IS NOT NULL GROUP BY o.currency
 )
 SELECT jsonb_build_object('mature_accounts',(SELECT count(*) FROM mature),'cash_net_cents',coalesce((SELECT jsonb_object_agg(currency,cents) FROM amounts),'{}'),
  'undated_accounts',(SELECT count(*) FROM mature WHERE (r->>'undated_payment')::boolean),
  'unresolved_orders',(SELECT count(*) FROM mature m JOIN public.polar_orders o ON o.user_id=(m.r->>'user_id')::uuid
    WHERE o.status IN ('paid','partially_refunded') AND o.amount>0 AND o.created_at<=p_at
     AND (o.paid_at IS NULL OR (o.paid_at>=(m.r->>'anchor_at')::timestamptz AND o.paid_at<(m.r->>'anchor_at')::timestamptz+interval '30 days'))
     AND (o.paid_at IS NULL OR o.currency IS NULL OR (o.status='partially_refunded' AND o.refunded_net_cents IS NULL))),
  'contribution',NULL,'contribution_status','costs_and_fees_incomplete') INTO revenue;
 SELECT coalesce(jsonb_object_agg(code,n),'{}') INTO errors FROM (SELECT e.code,count(*) n FROM public.first_value_errors e JOIN jsonb_array_elements(rows)r ON e.user_id=(r->>'user_id')::uuid WHERE e.created_at<=p_at GROUP BY e.code)x;
 RETURN jsonb_build_object('errors',errors,'generated_at',p_at,'cohort',p_cohort,'counts',counts,'costs',costs,'reasons',reasons,'revenue30',revenue,
  'details',jsonb_build_object('metric',p_metric,'total',total,'offset',greatest(0,p_offset),'rows',details),
  'enabled',(SELECT enabled FROM public.first_value_settings),'launched_at',(SELECT launched_at FROM public.first_value_settings));
END $$;
REVOKE ALL ON FUNCTION public.admin_first_value_report(text,date,date,timestamptz,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_first_value_report(text,date,date,timestamptz,text,integer) TO authenticated,service_role;
