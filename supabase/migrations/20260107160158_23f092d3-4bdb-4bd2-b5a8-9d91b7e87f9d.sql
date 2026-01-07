-- Drop the problematic recursive policy that causes infinite recursion
DROP POLICY IF EXISTS "Participants can view co-registrations" ON public.tournament_registrations;

-- The "Anyone can view tournament registrations" policy we just added is sufficient
-- and doesn't cause recursion since it uses USING (true)