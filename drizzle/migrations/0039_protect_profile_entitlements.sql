-- Profiles are server-created. RLS still limits reads and preference updates to the owner.
-- Table UPDATE overrides column grants, so remove broad rights before granting the
-- browser's explicit preference fields. Keep owner/service_role permissions intact.
DO $$
DECLARE profile_columns text;
BEGIN
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

  -- Also remove any old column grants; table-level REVOKE alone does not remove them.
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO profile_columns
    FROM pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped;
  EXECUTE format('REVOKE INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s)
    ON TABLE public.profiles FROM PUBLIC, anon, authenticated', profile_columns);

  GRANT UPDATE (preferred_language, language_selected_at, terms_accepted_at,
    terms_version, onboarding_completed_at, chat_retention_days,
    whats_new_seen_version, acquisition_source)
    ON TABLE public.profiles TO authenticated;
END;
$$;
--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
