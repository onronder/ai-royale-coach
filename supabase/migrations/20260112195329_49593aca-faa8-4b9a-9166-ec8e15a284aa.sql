-- Enable required extensions for HTTP calls from pg_cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create hourly cron job to check grace period expiry
-- Runs every hour at minute 0, until January 16th 2026 (function auto-disables after that)
SELECT cron.schedule(
  'check-grace-period-expiry-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vraqbzokccvqhthixoof.supabase.co/functions/v1/check-grace-period-expiry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYXFiem9rY2N2cWh0aGl4b29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDE4NzMsImV4cCI6MjA3OTAxNzg3M30.kbAcX7Wb06yzb-LlVX9BeoLmS1NGoK3C5ZaJphmdCU0'
    ),
    body := '{}'::jsonb
  );
  $$
);