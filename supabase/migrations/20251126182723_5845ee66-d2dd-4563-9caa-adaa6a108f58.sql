-- Add unique constraint for operation progress tracking
-- This ensures only one active operation per user/player/type combination
ALTER TABLE public.operation_progress 
ADD CONSTRAINT unique_active_operation 
UNIQUE (user_id, player_tag, operation_type);