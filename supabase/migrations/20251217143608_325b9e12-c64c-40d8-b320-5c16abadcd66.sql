-- Create webhook_events table for monitoring webhook health
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_id TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT,
  payload_summary JSONB,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for querying recent events
CREATE INDEX idx_webhook_events_processed_at ON public.webhook_events(processed_at DESC);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);

-- Enable RLS but allow service role full access
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No direct user access - only service role can read/write
CREATE POLICY "No direct access to webhook events"
  ON public.webhook_events
  FOR ALL
  USING (false);

-- Add comment for documentation
COMMENT ON TABLE public.webhook_events IS 'Tracks all processed webhook events for monitoring and debugging';