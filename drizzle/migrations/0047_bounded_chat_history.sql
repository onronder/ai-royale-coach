-- Additive/read-only. Retention, messages, subscriptions and campaign settings unchanged.
CREATE INDEX IF NOT EXISTS chat_messages_stable_page
ON public.chat_messages(user_id, player_tag, created_at DESC, id DESC);

CREATE FUNCTION public.get_my_chat_days(p_tag text, p_timezone text,
 p_before date DEFAULT NULL, p_limit integer DEFAULT 30)
RETURNS TABLE(day text, last_message_at timestamptz, message_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT (m.created_at AT TIME ZONE p_timezone)::date::text,
        max(m.created_at), count(*)
 FROM public.chat_messages m
 WHERE m.user_id = auth.uid()
   AND m.player_tag IN (upper(ltrim(btrim(p_tag),'#')), '#' || upper(ltrim(btrim(p_tag),'#')))
   AND m.created_at IS NOT NULL
   AND (p_before IS NULL OR m.created_at < (p_before::timestamp AT TIME ZONE p_timezone))
 GROUP BY (m.created_at AT TIME ZONE p_timezone)::date
 ORDER BY (m.created_at AT TIME ZONE p_timezone)::date DESC
 LIMIT least(greatest(coalesce(p_limit,30),1),31)
$$;
REVOKE ALL ON FUNCTION public.get_my_chat_days(text,text,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_chat_days(text,text,date,integer) TO authenticated;
