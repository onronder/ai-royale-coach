-- Existing platform columns/tables used by the admin reports, for socket-only tests.
ALTER TABLE auth.users ADD COLUMN created_at timestamptz DEFAULT now();
ALTER TABLE public.player_profiles ADD COLUMN created_at timestamptz DEFAULT now();
CREATE TABLE public.admin_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE TABLE public.user_fraud_status (user_id uuid PRIMARY KEY, status text NOT NULL);
