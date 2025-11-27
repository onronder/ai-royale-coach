-- Security Hardening: Restrict analyses table to authenticated users only
DROP POLICY IF EXISTS "Anyone can view analyses" ON public.analyses;
CREATE POLICY "Authenticated users can view analyses" 
ON public.analyses FOR SELECT 
TO authenticated 
USING (true);

-- Security Hardening: Restrict player_cache table to authenticated users only
DROP POLICY IF EXISTS "Anyone can read player cache" ON public.player_cache;
CREATE POLICY "Authenticated users can read player cache" 
ON public.player_cache FOR SELECT 
TO authenticated 
USING (true);