-- Reading a translation never updates the original task, its follow-up or its match.
CREATE TABLE IF NOT EXISTS public.coaching_translations (
  task_id uuid NOT NULL REFERENCES public.coaching_tasks(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en','es','fr','pt','tr')),
  source_hash text NOT NULL,
  translation jsonb NOT NULL,
  PRIMARY KEY (task_id, language, source_hash)
);
--> statement-breakpoint
ALTER TABLE public.coaching_translations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.coaching_translations FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.coaching_translations TO service_role;
