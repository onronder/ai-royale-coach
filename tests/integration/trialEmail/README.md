Acceptance tests for the day-two reminder and trial summary senders against the real SQL in
`drizzle/migrations/0018_trial_email_send_gate.sql`, using a throwaway local Postgres (never the live database).

    initdb -D /tmp/pgt/data -U postgres   # as a non-root user
    pg_ctl -D /tmp/pgt/data -o "-p 55432 -k /tmp/pgt -c listen_addresses=''" start
    TRIAL_EMAIL_PG=/tmp/pgt bun test tests/integration/trialEmail
