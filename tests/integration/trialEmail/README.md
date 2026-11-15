Acceptance tests for the day-two reminder and trial summary senders against the real SQL in
`drizzle/migrations/0018_trial_email_send_gate.sql`, using a throwaway local Postgres (never the live database).

    initdb -D /tmp/pgt/data -U postgres   # as a non-root user
    pg_ctl -D /tmp/pgt/data -o "-p 55432 -k /tmp/pgt -c listen_addresses=''" start
    TRIAL_EMAIL_PG=/tmp/pgt bun test tests/integration/trialEmail

Both workers return 202 for an unresolved earlier send. Keep that attempt when the list is delayed, the provider is unavailable, the task changes or consent is withdrawn. New messages carry a unique delivery tag. For an already-started message from before this release, an untagged entry cannot prove delivery. The original frozen request can be replayed only while its task is still eligible and its key is less than 23 hours old. Otherwise leave it pending for read-only reconciliation. Never clear the attempt to force another send.

Record the GitHub merge and both deployed worker revisions/times separately in the PR. There is no website or database change in this release. Check natural worker outcomes and provider IDs after activation; all acceptance tests use a local provider.
