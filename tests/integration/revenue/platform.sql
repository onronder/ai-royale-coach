-- Existing platform columns/tables used by the admin reports, for socket-only tests.
ALTER TABLE public.polar_orders ADD COLUMN customer_id text;
ALTER TABLE auth.users ADD COLUMN created_at timestamptz DEFAULT now();
ALTER TABLE public.player_profiles ADD COLUMN created_at timestamptz DEFAULT now();
CREATE TABLE public.admin_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE TABLE public.user_fraud_status (user_id uuid PRIMARY KEY, status text NOT NULL);

-- Local stand-in for pg_net. Dispatch stays inside this disposable database.
CREATE SCHEMA net;
CREATE TABLE net.requests(body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.requests VALUES (body) RETURNING 1::bigint $$;
