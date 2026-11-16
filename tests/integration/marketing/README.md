Acceptance tests for campaign-email consent, the promotional send gate and privacy requests, run against the real SQL in
`drizzle/migrations/0020_marketing_consent.sql` on a throwaway local Postgres reachable only through a Unix socket.

    initdb -D /tmp/pgm/data -U postgres          # as a non-root user
    pg_ctl -D /tmp/pgm/data -o "-p 55433 -k /tmp/pgm -c listen_addresses=''" start
    MARKETING_PG=/tmp/pgm bun test tests/integration/marketing

The suite removes Supabase/Resend/Polar credentials from its environment and replaces `fetch` with a trap, then asserts
that no network request was attempted. Mail goes to an in-memory fake provider.
