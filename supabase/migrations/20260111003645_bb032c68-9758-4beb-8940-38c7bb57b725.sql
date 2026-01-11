-- Drop the existing public policy for clans
DROP POLICY IF EXISTS "Anyone can view clans" ON public.clans;

-- Create new policy for authenticated users only
CREATE POLICY "Authenticated users can view clans" 
ON public.clans
FOR SELECT
TO authenticated
USING (true);