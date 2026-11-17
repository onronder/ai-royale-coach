# Fix: Preferences → Coach transition hides the invite

**Cause (confirmed in code):** Coach invite and E-posta Tercihleri both cache under `['marketing-consent', userId]`. Preferences fetches with "do not claim the invite"; Coach then reuses that cached answer (60s fresh) and never sends its own claiming request, so `invite=false`.

## Changes
1. **Separate cache keys by purpose**
   - Coach invite: `['marketing-consent', userId, 'coach']` → claims the invite (`true`).
   - Preferences: `['marketing-consent', userId, 'prefs']` → read-only (`false`), never consumes the invite.
2. **Keep both screens current after a decision.** Coach's choose/dismiss and Preferences' save/withdraw invalidate the shared prefix `['marketing-consent', userId]`. After Coach accepts/declines, its own cached invite is set to `false` (no re-claim loop; server latch already guarantees one claim).
3. **Acceptance tests**
   - App-level test (TanStack Query + mocked RPC): render Preferences then Coach → RPC called with `[false, true]`, invite shown once, no consent recorded; a second Coach mount does not show it again; a decision in one screen refreshes the other.
   - SQL integration test (fake provider, local DB): `get(false)` then `get(true)` → invite true once, state `not_asked`, zero events; later `get(true)` → false.
4. Run 33/34 acceptance tests + app tests isolated; zero network calls.

No server rule changes, no data structure change, sending stays off, no publication. Changes stay in this draft; PR #12 must be updated by pushing the branch (my tools cannot push).
