-- Add chat_retention_days column to profiles table
-- NULL = keep forever, otherwise number of days (7, 30, 90)
ALTER TABLE public.profiles 
ADD COLUMN chat_retention_days integer DEFAULT 30;