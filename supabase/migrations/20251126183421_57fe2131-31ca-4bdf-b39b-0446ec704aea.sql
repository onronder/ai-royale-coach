-- Add 'cancelled' status support to operation_progress
-- The status column already exists as text, so we just need to ensure 'cancelled' is a valid value
-- No schema change needed, but documenting the valid statuses: 'running', 'completed', 'failed', 'cancelled'

-- Add comment to document valid status values
COMMENT ON COLUMN operation_progress.status IS 'Valid values: running, completed, failed, cancelled';