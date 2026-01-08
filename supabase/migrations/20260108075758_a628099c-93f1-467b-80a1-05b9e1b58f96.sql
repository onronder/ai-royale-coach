-- ============================================
-- Production-Grade Fraud Detection Fixes
-- ============================================

-- Part 1: Insert Admin User
INSERT INTO public.admin_roles (user_id, role, granted_by, granted_at)
VALUES (
  '6d37fc66-03a4-4dbc-bdbb-55b6a6693e46',
  'admin',
  '6d37fc66-03a4-4dbc-bdbb-55b6a6693e46',
  now()
) ON CONFLICT DO NOTHING;

-- Part 2: Remove Dangerous RLS Policies
DROP POLICY IF EXISTS "Service role can insert fraud signals" ON fraud_signals;
DROP POLICY IF EXISTS "Service role can manage fraud status" ON user_fraud_status;

-- Part 3: Fix device_fingerprints UPDATE Policy
DROP POLICY IF EXISTS "Users can update own fingerprints" ON device_fingerprints;
CREATE POLICY "Users can update own fingerprints"
  ON device_fingerprints FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Part 4: Align is_admin() function to use has_admin_role()
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_admin_role(p_user_id, 'admin'::admin_role)
$$;