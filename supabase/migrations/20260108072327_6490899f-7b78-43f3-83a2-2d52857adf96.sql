-- Create admin role enum type
DO $$ BEGIN
  CREATE TYPE public.admin_role AS ENUM ('admin', 'moderator', 'support');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table: fraud_signals - Stores individual fraud indicators
CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  details JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  fingerprint_hash TEXT,
  player_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON fraud_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_fingerprint ON fraud_signals(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_type ON fraud_signals(signal_type, created_at);

-- Table: device_fingerprints - Tracks device identifiers
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL,
  user_id UUID NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  seen_count INTEGER DEFAULT 1,
  UNIQUE(fingerprint_hash, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON device_fingerprints(fingerprint_hash);

-- Table: user_fraud_status - Aggregated fraud score per user
CREATE TABLE IF NOT EXISTS public.user_fraud_status (
  user_id UUID PRIMARY KEY,
  fraud_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'clean',
  signals_count INTEGER DEFAULT 0,
  last_signal_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  feature_limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: admin_roles - Admin permissions
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role admin_role NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Table: admin_audit_log - Track admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fraud_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Function: Check if user has admin role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_admin_role(p_user_id UUID, p_role admin_role DEFAULT 'admin')
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = p_user_id AND role = p_role
  )
$$;

-- Function: Check if user is any type of admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles WHERE user_id = p_user_id
  )
$$;

-- RLS Policies for fraud_signals
CREATE POLICY "Users can view own fraud signals"
  ON fraud_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fraud signals"
  ON fraud_signals FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert fraud signals"
  ON fraud_signals FOR INSERT
  WITH CHECK (true);

-- RLS Policies for device_fingerprints
CREATE POLICY "Users can view own fingerprints"
  ON device_fingerprints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fingerprints"
  ON device_fingerprints FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own fingerprints"
  ON device_fingerprints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fingerprints"
  ON device_fingerprints FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_fraud_status
CREATE POLICY "Users can view own fraud status"
  ON user_fraud_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fraud status"
  ON user_fraud_status FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update fraud status"
  ON user_fraud_status FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage fraud status"
  ON user_fraud_status FOR ALL
  WITH CHECK (true);

-- RLS Policies for admin_roles
CREATE POLICY "Admins can view admin roles"
  ON admin_roles FOR SELECT
  USING (is_admin(auth.uid()));

-- RLS Policies for admin_audit_log
CREATE POLICY "Admins can view audit log"
  ON admin_audit_log FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit log"
  ON admin_audit_log FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Function: Detect multi-account abuse
CREATE OR REPLACE FUNCTION public.detect_multi_account_abuse(
  p_fingerprint_hash TEXT,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_users INTEGER;
BEGIN
  SELECT COUNT(DISTINCT df.user_id) INTO v_other_users
  FROM device_fingerprints df
  JOIN profiles p ON p.id = df.user_id
  WHERE df.fingerprint_hash = p_fingerprint_hash
    AND df.user_id != p_user_id
    AND p.trial_used = true;
  
  IF v_other_users >= 2 THEN
    INSERT INTO fraud_signals (user_id, signal_type, severity, fingerprint_hash, details)
    VALUES (p_user_id, 'multi_account', 'high', p_fingerprint_hash, 
            jsonb_build_object('shared_users', v_other_users));
    
    PERFORM update_user_fraud_score(p_user_id);
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function: Detect velocity abuse
CREATE OR REPLACE FUNCTION public.detect_velocity_abuse(
  p_user_id UUID,
  p_feature_name TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 10
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_recent_count
  FROM daily_usage_logs
  WHERE user_id = p_user_id
    AND feature_name = p_feature_name
    AND used_at > (now() - (p_window_seconds || ' seconds')::interval);
  
  IF v_recent_count >= p_max_requests THEN
    INSERT INTO fraud_signals (user_id, signal_type, severity, details)
    VALUES (p_user_id, 'velocity', 'medium', 
            jsonb_build_object('feature', p_feature_name, 'count', v_recent_count, 'window', p_window_seconds));
    
    PERFORM update_user_fraud_score(p_user_id);
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function: Update fraud score based on signals
CREATE OR REPLACE FUNCTION public.update_user_fraud_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_count INTEGER;
  v_status TEXT;
BEGIN
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE 
      WHEN severity = 'critical' THEN 30
      WHEN severity = 'high' THEN 20
      WHEN severity = 'medium' THEN 10
      WHEN severity = 'low' THEN 5
      ELSE 0
    END), 0)
  INTO v_count, v_score
  FROM fraud_signals
  WHERE user_id = p_user_id
    AND created_at > (now() - interval '30 days');
  
  v_score := LEAST(v_score, 100);
  
  v_status := CASE
    WHEN v_score >= 70 THEN 'soft_blocked'
    WHEN v_score >= 40 THEN 'warning'
    ELSE 'clean'
  END;
  
  INSERT INTO user_fraud_status (user_id, fraud_score, status, signals_count, last_signal_at)
  VALUES (p_user_id, v_score, v_status, v_count, now())
  ON CONFLICT (user_id) DO UPDATE SET
    fraud_score = EXCLUDED.fraud_score,
    status = EXCLUDED.status,
    signals_count = EXCLUDED.signals_count,
    last_signal_at = EXCLUDED.last_signal_at,
    updated_at = now();
  
  RETURN v_score;
END;
$$;

-- Function: Get fraud overview stats for admin
CREATE OR REPLACE FUNCTION public.get_fraud_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_signals', (SELECT COUNT(*) FROM fraud_signals WHERE created_at > now() - interval '30 days'),
    'signals_today', (SELECT COUNT(*) FROM fraud_signals WHERE created_at > now() - interval '1 day'),
    'soft_blocked_users', (SELECT COUNT(*) FROM user_fraud_status WHERE status = 'soft_blocked'),
    'warned_users', (SELECT COUNT(*) FROM user_fraud_status WHERE status = 'warning'),
    'pending_reviews', (SELECT COUNT(*) FROM user_fraud_status WHERE status IN ('soft_blocked', 'warning') AND reviewed_at IS NULL),
    'signals_by_type', (
      SELECT jsonb_object_agg(signal_type, cnt)
      FROM (SELECT signal_type, COUNT(*) as cnt FROM fraud_signals WHERE created_at > now() - interval '30 days' GROUP BY signal_type) t
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;