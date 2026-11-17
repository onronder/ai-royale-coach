## Checks before reporting
- Run your two new tests plus the existing 30 acceptance tests (32 total) against the isolated local database with the fake provider; confirm 0 network attempts.
- Run the 103 app tests and the production build.
- Report the final commit and results. No screenshots, no live data, no publish.

## Technical details
- `src/pages/Auth.tsx` / `src/lib/marketingConsent.ts`: add a `boxShown` flag set only when collection lookup resolved open and the checkbox rendered; omit `marketing` from signup metadata when false; skip the post-OAuth `setMarketingConsent` when the OAuth box was not shown. Sign-up trigger already treats missing metadata as no event (verify; adjust in migration if not).
- New migration `0023`: the state function that returns `invite` atomically claims it (`UPDATE ... SET invite_shown_at = now() WHERE ... IS NULL RETURNING`, row-locked) and returns true only to the claimer; `mark_marketing_prompt('shown')` becomes idempotent. Recorded in this draft only.
- `MarketingInvite.tsx`: render invite only from the claiming response; keep `shownHere` latch; drop the separate "mark shown" race.
- Update the `AGENTS.md` campaign-consent rule with one line on box-shown and atomic invite claim.
