-- Allow admins to view all profiles for user lookup
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow admins to view all player profiles for user lookup
CREATE POLICY "Admins can view all player profiles"
ON public.player_profiles
FOR SELECT
USING (is_admin(auth.uid()));