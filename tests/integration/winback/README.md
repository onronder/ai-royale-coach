Win-back account cooldown acceptance tests: real SQL (`0020`–`0024`, `0026_winback_account_cooldown.sql`, `0027_winback_verified_first_acceptance.sql`) and the real
promotional sender code, on a throwaway socket-only Postgres with an in-memory fake email provider (network disabled).

    initdb -D /tmp/pgw/data -U postgres -A trust --no-locale      # as a non-root user
    pg_ctl -D /tmp/pgw/data -o "-p 55483 -k /tmp/pgw -c listen_addresses=''" start
    WINBACK_PG=/tmp/pgw bun test tests/integration/winback
