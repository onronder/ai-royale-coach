CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_messages(p_limit integer DEFAULT 5000)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE n integer;
BEGIN
  WITH doomed AS (
    SELECT m.id FROM public.chat_messages m JOIN public.profiles p ON p.id = m.user_id
    WHERE p.chat_retention_days IS NOT NULL AND p.chat_retention_days > 0
      AND m.created_at < now() - make_interval(days => p.chat_retention_days)
    ORDER BY m.created_at LIMIT greatest(1, least(p_limit, 50000))
  )
  DELETE FROM public.chat_messages c USING doomed WHERE c.id = doomed.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_expired_chat_messages(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(integer) TO service_role;
DO $$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-old-chat-messages';
  PERFORM cron.schedule('cleanup-old-chat-messages', '0 3 * * *', 'SELECT public.cleanup_expired_chat_messages(5000)');
END $$;