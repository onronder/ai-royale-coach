-- Fix function search_path security issue by recreating with CASCADE
DROP TRIGGER IF EXISTS update_operation_progress_updated_at_trigger ON public.operation_progress;
DROP FUNCTION IF EXISTS public.update_operation_progress_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_operation_progress_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_operation_progress_updated_at_trigger
  BEFORE UPDATE ON public.operation_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_operation_progress_updated_at();