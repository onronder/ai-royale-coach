-- ============================================
-- Remove user access to fraud signals (CRITICAL SECURITY FIX)
-- Users should NEVER see their own fraud detection data
-- This prevents them from learning how to circumvent security
-- ============================================

DROP POLICY IF EXISTS "Users can view own fraud signals" ON public.fraud_signals;