# FEAT01 · One more match with the same deck

Repository: ai-royale-coach, existing Lovable Cloud. No dependency on PR #22. This PR is a release candidate.

## Player contract

The trial/paid first-task card offers a single voluntary repeat after a saved first score, for either keeping the deck or swapping one card. Acceptance freezes that result, the eight card IDs and one sentence of the saved goal. Only a server check can attach a second score. Neither the offer nor its acceptance consumes the existing follow-up or generates AI. The free screen retains its existing first result and upgrade path. An upgrade continues the same task ID. Expired owners can read saved results.

FEAT_FIX_003 routes both first-match paths and the repeat through the common battle validator. New results use validated 1v1 observations with the player on either side. Conflicting observations are excluded before selection. The earliest accessible matching observation must occur strictly after acceptance and the first match, with the same eight card IDs in any order. The recent game log can be incomplete. Previously stored results are retained. A failed or stale refresh leaves the repeat pending and displays a refresh error. A fresh empty result can be checked again. Returning to a visible pending card can check once; the server limits automatic checks across devices to one per 30 seconds. Manual checking remains available.

The original follow-up still owns alternative-card selection. A different set of eight cards closes a pending repeat under the same database row lock. If completion commits first the saved comparison survives the change. Reordering cards has no effect. Two scores describe the recorded matches and supply no causal evidence about the tactic.

## Pilot measurement

Admin → Trials uses its selected first-exposure window (7/30/90 days). Each tier counts distinct accounts. Tier is fixed at the first offer on each task. A user with several tasks in a tier counts once, with a single 168-hour window anchored to their first acceptance. A return or a second score on any of their accepted tasks in that tier counts once within that window. An account exposed in both tiers may appear in each; the rows should not be summed as unique people. Administrator exposures are excluded.

- Acceptance: accepted accounts / accounts shown the offer. At least half of the button must enter the visible viewport. A successful acceptance also proves exposure if the display event was interrupted.
- Seven-day return: accepted accounts observed on the same task in a later app visit / accepted accounts with a full 168 hours of observation.
- Seven-day match: accepted accounts with a second result saved within 168 hours / the same mature accepted cohort. A first-session match counts here. A scheduled match time alone does not establish that a result was delivered.
- A browser visit is account-scoped, shared across tabs, and renewed after 30 minutes of inactivity. Another browser/device starts its own visit. Storage unavailability leaves visit identity unknown and cannot establish a return. Denominator zero renders a dash with the underlying counts.

## Release on separate approval

1. Merge after the required quality check passes. Record the full merged revision. Verify the publication preflight for that revision.
2. Apply additive migration 0048 to the existing application database. No backfill. Deploy both first-session-coaching and first-value-coaching from the same merged revision; both embed the shared matcher.
3. Publish the matching frontend. By default new offers are closed. Enable only COACHING_PRACTICE_REPEAT_ENABLED=true on the coaching service when ready for the trial/paid pilot. To pause new offers, remove it or set it to false. Existing accepted repeats stay readable and eligible active players can finish them.
4. Verify the published revision, both first-task variants, historical reading, the admin aggregates and the existing campaign switch (off). Use isolated fixtures for synthetic matches. Compare natural pilot events only after their observation window has matured. No email, billing, entitlement or marketing configuration is required.

## Isolated acceptance

The required GitHub quality workflow runs the real edge entrypoint against synthetic transport, socket-only PostgreSQL and the real free handler, and browser journeys with external services blocked. The browser harness exercises both task variants, five languages, narrow and wide viewports, manual and foreground-return checks, error recovery, follow-up availability and the report. The database test orders the competing writes both ways with separate connections and loads the existing alternative-card retention trigger. Neither test outcomes nor local fixture tallies are production adoption rates.
