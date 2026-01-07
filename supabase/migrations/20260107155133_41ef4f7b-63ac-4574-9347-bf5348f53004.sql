-- Allow anyone to view tournament registrations for public display (participant counts, etc.)
CREATE POLICY "Anyone can view tournament registrations" 
ON public.tournament_registrations
FOR SELECT
USING (true);