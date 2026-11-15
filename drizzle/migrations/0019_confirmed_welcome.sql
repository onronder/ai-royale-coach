-- Activation is separate from installation so old and new senders never own the same signup.
CREATE TABLE public.welcome_cutover (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  activated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.confirmed_welcome (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  language text NOT NULL,
  confirmed_at timestamptz NOT NULL,
  ticket uuid UNIQUE,
  queued_at timestamptz,
  started_at timestamptz,
  payload jsonb,
  resend_id text UNIQUE,
  accepted_at timestamptz
);
ALTER TABLE public.welcome_cutover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmed_welcome ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.welcome_cutover, public.confirmed_welcome FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.welcome_cutover TO service_role;
CREATE INDEX confirmed_welcome_pending ON public.confirmed_welcome (queued_at NULLS FIRST) WHERE accepted_at IS NULL;

CREATE FUNCTION public.enqueue_first_confirmed_welcome() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL OR NEW.email IS NULL OR NEW.invited_at IS NOT NULL
    OR NEW.raw_app_meta_data->>'provider' IS DISTINCT FROM 'email' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO public.confirmed_welcome (user_id,email,language,confirmed_at)
    SELECT NEW.id, NEW.email, coalesce(NEW.raw_user_meta_data->>'language','en'), NEW.email_confirmed_at
    FROM public.welcome_cutover WHERE NEW.created_at >= activated_at
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER first_confirmed_welcome AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_first_confirmed_welcome();

CREATE FUNCTION public.queue_confirmed_welcomes(project_url text, anon_key text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record;
BEGIN
  FOR r IN
    WITH due AS (
      SELECT w.user_id FROM public.confirmed_welcome w JOIN auth.users u ON u.id=w.user_id
      WHERE w.accepted_at IS NULL AND u.email=w.email AND u.email_confirmed_at IS NOT NULL
        AND (w.queued_at IS NULL OR w.queued_at <= now()-interval '5 minutes')
        AND (w.started_at IS NULL OR w.started_at > now()-interval '23 hours')
      ORDER BY w.queued_at NULLS FIRST, w.user_id LIMIT 50 FOR UPDATE OF w SKIP LOCKED
    )
    UPDATE public.confirmed_welcome w SET ticket=gen_random_uuid(), queued_at=now()
    FROM due WHERE due.user_id=w.user_id RETURNING w.ticket
  LOOP
    PERFORM net.http_post(url:=rtrim(project_url,'/') || '/functions/v1/confirmed-welcome',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || anon_key),
      body:=jsonb_build_object('ticket',r.ticket));
  END LOOP;
END $$;

CREATE FUNCTION public.claim_confirmed_welcome(p_ticket uuid)
RETURNS TABLE(user_id uuid,email text,language text,payload jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.confirmed_welcome w SET ticket=NULL FROM auth.users u
  WHERE w.ticket=p_ticket AND w.queued_at > now()-interval '5 minutes' AND w.accepted_at IS NULL
    AND u.id=w.user_id AND u.email=w.email AND u.email_confirmed_at IS NOT NULL
  RETURNING w.user_id,w.email,w.language,w.payload;
$$;
CREATE FUNCTION public.begin_confirmed_welcome(p_user uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.confirmed_welcome w
  SET payload=coalesce(w.payload,p_payload), started_at=coalesce(w.started_at,now())
  FROM auth.users u WHERE u.id=w.user_id AND u.email=w.email AND u.email_confirmed_at IS NOT NULL
    AND w.user_id=p_user AND w.accepted_at IS NULL
    AND (w.started_at IS NULL OR w.started_at > now()-interval '23 hours')
  RETURNING w.payload;
$$;
CREATE FUNCTION public.record_confirmed_welcome(p_user uuid,p_message text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH saved AS (
    UPDATE public.confirmed_welcome SET accepted_at=coalesce(accepted_at,now()),resend_id=p_message,payload=NULL
    WHERE user_id=p_user AND started_at IS NOT NULL AND length(p_message)>0
      AND (resend_id IS NULL OR resend_id=p_message) RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM saved);
$$;
REVOKE ALL ON FUNCTION public.enqueue_first_confirmed_welcome(), public.queue_confirmed_welcomes(text,text),
  public.claim_confirmed_welcome(uuid),public.begin_confirmed_welcome(uuid,jsonb),public.record_confirmed_welcome(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_confirmed_welcome(uuid),public.begin_confirmed_welcome(uuid,jsonb),
  public.record_confirmed_welcome(uuid,text) TO service_role;
