-- Create table for API request logs (admin monitoring)
CREATE TABLE public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  endpoint TEXT NOT NULL,
  query_key TEXT,
  method TEXT NOT NULL DEFAULT 'SELECT',
  duration_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_api_request_logs_created_at ON public.api_request_logs(created_at DESC);
CREATE INDEX idx_api_request_logs_endpoint ON public.api_request_logs(endpoint);
CREATE INDEX idx_api_request_logs_user_id ON public.api_request_logs(user_id);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all API logs"
ON public.api_request_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Allow inserts from authenticated users (for client-side logging)
CREATE POLICY "Authenticated users can insert logs"
ON public.api_request_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Auto-cleanup: Delete logs older than 7 days (via scheduled job or trigger)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_request_logs WHERE created_at < now() - interval '7 days';
END;
$$;