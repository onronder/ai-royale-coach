-- Create operation_progress table for tracking long-running operations
CREATE TABLE IF NOT EXISTS public.operation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_tag TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  progress INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 100,
  current_step TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

-- Enable RLS
ALTER TABLE public.operation_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own operation progress"
  ON public.operation_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own operation progress"
  ON public.operation_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operation progress"
  ON public.operation_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own operation progress"
  ON public.operation_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_operation_progress_user_player_type 
  ON public.operation_progress(user_id, player_tag, operation_type);

CREATE INDEX idx_operation_progress_status 
  ON public.operation_progress(status);

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.operation_progress;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_operation_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
CREATE TRIGGER update_operation_progress_updated_at_trigger
  BEFORE UPDATE ON public.operation_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_operation_progress_updated_at();