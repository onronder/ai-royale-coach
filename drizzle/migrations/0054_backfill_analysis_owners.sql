-- Run after 0053 commits. Regular reads and new inserts can continue throughout.
SET LOCAL lock_timeout = '2s';
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_locks WHERE pid = pg_backend_pid()
      AND relation = 'public.analyses'::regclass AND mode = 'AccessExclusiveLock' AND granted)
      AND EXISTS (SELECT FROM public.analyses LIMIT 1) THEN
    RAISE EXCEPTION 'Commit 0053 before backfilling analysis history';
  END IF;
END $$;

UPDATE public.analyses a SET user_id = u.id FROM auth.users u
WHERE a.user_id IS NULL AND u.id = ai_royale_private.summary_author(a.analysis_type, a.player_tag, a.input_fingerprint);

-- Archive and delete in a single statement. An error rolls both operations back.
WITH moved AS (
  DELETE FROM public.analyses WHERE user_id IS NULL
    RETURNING id, player_tag, analysis_type, input_fingerprint, output, created_at
)
INSERT INTO ai_royale_private.unattributed_analyses(id, player_tag, analysis_type, input_fingerprint, output, created_at)
  SELECT id, player_tag, analysis_type, input_fingerprint, output, created_at FROM moved;

ALTER TABLE public.analyses VALIDATE CONSTRAINT analyses_owner_fk;
ALTER TABLE public.analyses VALIDATE CONSTRAINT analyses_owner_present;
