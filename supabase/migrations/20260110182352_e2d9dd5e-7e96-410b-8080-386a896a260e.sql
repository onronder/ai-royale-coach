-- Allow admins to read webhook events for monitoring
CREATE POLICY "Admins can read webhook events" 
ON public.webhook_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Store project URL in vault for pg_cron
SELECT vault.create_secret(
  'https://vraqbzokccvqhthixoof.supabase.co',
  'project_url',
  'Supabase project URL for pg_cron'
);

-- Store anon key in vault for pg_cron
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYXFiem9rY2N2cWh0aGl4b29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDE4NzMsImV4cCI6MjA3OTAxNzg3M30.kbAcX7Wb06yzb-LlVX9BeoLmS1NGoK3C5ZaJphmdCU0',
  'anon_key',
  'Supabase anon key for pg_cron'
);

-- Schedule grace period expiry check every hour
SELECT cron.schedule(
  'check-grace-period-expiry',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/check-grace-period-expiry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);