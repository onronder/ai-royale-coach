-- Follow 0038 without rewriting it. Profiles are server-created; clients may
-- only change their own preferences. Revoking table privileges also revokes
-- corresponding column grants. PUBLIC must be included because its grants
-- remain effective even after direct anon/authenticated grants are removed.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT UPDATE (preferred_language, language_selected_at, terms_accepted_at,
  terms_version, onboarding_completed_at, chat_retention_days,
  whats_new_seen_version, acquisition_source)
  ON TABLE public.profiles TO authenticated;
--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
