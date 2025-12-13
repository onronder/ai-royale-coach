-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view tournament registrations" ON public.tournament_registrations;

-- Users can view their own registrations
CREATE POLICY "Users can view own registrations"
ON public.tournament_registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Tournament organizers can view all registrations for their tournaments
CREATE POLICY "Tournament organizers can view registrations"
ON public.tournament_registrations
FOR SELECT
USING (
  tournament_id IN (
    SELECT id FROM public.tournaments WHERE created_by = auth.uid()
  )
);

-- Participants can view other registrations in tournaments they're registered in (for brackets)
CREATE POLICY "Participants can view co-registrations"
ON public.tournament_registrations
FOR SELECT
USING (
  tournament_id IN (
    SELECT tournament_id FROM public.tournament_registrations WHERE user_id = auth.uid()
  )
);