-- Add unique constraint for player tags per user (prevent duplicates)
ALTER TABLE public.player_profiles 
ADD CONSTRAINT player_profiles_user_player_unique UNIQUE (user_id, player_tag);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_player_profiles_user_id ON public.player_profiles(user_id);

-- Create a function to enforce max 3 player tags per user
CREATE OR REPLACE FUNCTION public.enforce_max_player_tags()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.player_profiles WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 player tags per user allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce the limit
CREATE TRIGGER enforce_max_player_tags_trigger
BEFORE INSERT ON public.player_profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_player_tags();

-- Add RLS policy for users to delete their own player profiles
CREATE POLICY "Users can delete own player profiles" 
ON public.player_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add RLS policy for users to insert own player profiles  
CREATE POLICY "Users can insert own player profiles" 
ON public.player_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);