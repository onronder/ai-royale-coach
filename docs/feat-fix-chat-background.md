# FEAT_FIX_001 / FEAT_FIX_002 — isolated acceptance

Reference: production repository `onronder/ai-royale-coach`, starting main
`10c10165eea6e4b50345bf0781c489e83f768668`. Infrastructure stays on Lovable Cloud.
The migration repository and PR #22 are outside this change.

## Changes

**FEAT_FIX_001.** The chat client requires explicit provider completion,
non-empty content, and an error-free stream before inserting an assistant reply.
It shares the existing server trial-stream success predicate. It consumes the
stream through EOF so the server's completion/accounting flush is not cancelled
by receipt of the terminal marker. Split UTF-8, CRLF, `data:` with or without a
space, and an unterminated final line are supported.

Truncation, error events, malformed JSON, content filtering and reader errors
remove the temporary reply and show the existing translated failure notice.
An insert error or missing inserted row shows a separate notice in all five
languages. No automatic regeneration or save retry is introduced. Successful
inserts replace the temporary reply (or appear after the initial history load)
only in the originating account/player/day view; late results cannot appear in
another day's conversation. Account replacement is checked before persistence
and success usage logging. A completed same-account reply can still be saved
for its original player after navigating away.

Provider attempts, server trial accounting, and client success usage remain
separate: this change does not refund/reset an entitlement after provider success
or a storage failure. Client success usage is recorded only after a confirmed
assistant insert. No model, prompt, server quota or entitlement code changed.

**FEAT_FIX_002.** The owner of a background operation invalidates its original
player's cache on confirmed completion, independently of the initiating view's
lifetime. Joined observers do not duplicate operations or refetches. Card/mastery
context and the separate deck-statistics cache are refreshed; deck key matching
normalizes the player tag. A reused completed collection sync refreshes the
cache without claiming a new sync in a notification. Visible success notifications remain tied to the
originating view and use the current language. A different active account blocks
old-account invalidation and subsequent work. Failed/unknown/cancelled operations
are not announced as successes and are not automatically retried.

## Acceptance and evidence boundaries

The browser harness uses the real React chat component, background hook,
card/mastery queries, deck-statistics hook, and QueryClient. Only transport/data
responses are synthetic. All non-fixture network destinations are blocked;
no production database, AI/game provider, payment, email or setting was used.

Before implementation, the actual browser reproduced both original failures:
- `truncated`: one assistant insert instead of zero.
- `language` during background completion: the cached mastery stayed old.

Regression coverage:
- Complete and brand-new chat; partial EOF; provider error; malformed frame;
  filtered/empty result; reader failure; failed insert and empty insert response.
- Delayed response with player/account/language switch, old-day navigation,
  panel close/reopen, and two tabs with independent user-initiated requests.
- Five-language save-error display at 390 and 1280 px; free/expired access gates
  and unchanged trial/paid chat availability.
- Stable background work, A → B → A, A finishing while B is visible, language
  change, two observers, owner/all observers unmounting, logout/account switch,
  partial/full failure, failed count and completed/cancelled collection sync.
- Observable old → fresh data with the real QueryClient, one initial read plus
  one completion refetch, and no invalidation of the departed account.

Local validation: 223 application tests and 6 handler tests passed; type check,
production build and five-language bundle budgets passed. All 45 new browser
scenarios passed, plus 70 existing chat, 9 history-pagination and 9 maintenance
scenarios. The maintenance regression includes failure/unknown outcomes and
shared context reads; it confirms the existing success notifications are kept.

The stream tests also compare the completion verdict with the existing server
predicate and ensure a terminal marker does not prematurely cancel EOF. The
mandatory GitHub `quality` job runs this browser suite alongside existing checks.

This is isolated acceptance, not evidence of customer incidence, production
latency, provider charges or physical-device acceptance. Existing provider-side
accounting and authorization tests/code remain unchanged.

## Release scope

One frontend PR only. No migration, edge-function deployment, merge, production
publication, campaign toggle or live-data mutation is part of this work.
Campaign sending remains off; no campaign-setting write is made. A future
publication must follow the existing exact-revision quality/preflight procedure.
