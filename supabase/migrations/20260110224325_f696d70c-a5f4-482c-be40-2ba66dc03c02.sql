-- ============================================
-- SECURITY HARDENING: Defense-in-Depth
-- ============================================

-- 1. Restrict leaderboard to authenticated users only
-- Prevents unauthenticated scraping of player identities
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.leaderboard_entries;

CREATE POLICY "Authenticated users can view leaderboard"
ON public.leaderboard_entries
FOR SELECT
TO authenticated
USING (true);

-- 2. Add defense-in-depth for fraud_signals
-- Ensure anon role cannot access even if policies are misconfigured
REVOKE ALL ON public.fraud_signals FROM anon;