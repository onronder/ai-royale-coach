-- The validated check lets SET NOT NULL skip the table scan. Keep the check until
-- after SET NOT NULL has completed. This transaction has no data movement.
SET LOCAL lock_timeout = '2s';
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_constraint WHERE conrelid = 'public.analyses'::regclass
      AND conname = 'analyses_owner_present' AND convalidated) THEN
    RAISE EXCEPTION 'Validate analysis ownership in 0054 before finalizing';
  END IF;
END $$;
ALTER TABLE public.analyses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.analyses DROP CONSTRAINT analyses_owner_present;
CREATE OR REPLACE VIEW public.verified_profile_summaries AS
SELECT user_id, player_tag, analysis_type, input_fingerprint, output, created_at
FROM public.analyses WHERE analysis_type = 'profile_summary';
ALTER POLICY "Owner reads linked player analyses" ON public.analyses
  USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.player_profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND upper(ltrim(p.player_tag, '#')) = upper(ltrim(analyses.player_tag, '#'))));
REVOKE EXECUTE ON FUNCTION ai_royale_private.summary_author(text,text,text) FROM authenticated, service_role;
