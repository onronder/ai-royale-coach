# Releasing K1, K2 and K3

Use the live Lovable Cloud project linked from the README. Run the rollout in a low-traffic window. Each numbered migration file is atomic and must commit before the next file starts. Use the same migration ledger as the installation, recording each file only after a successful application. Keep the webhook and Edge versions paired with the stages below.

1. Check the target migration history as described below. Immediately before 0050, run the [account and archive impact query](../scripts/sql/pr57-impact.sql) and the [payment recovery and trial cohort query](../scripts/sql/pr57-recovery-and-trials.sql). Save their timestamped aggregate results with the release record.
2. Apply 0050. It captures the enabled profile IDs of already overdue accounts when the selection is nonempty and fits the recorded slot allowance. The capture and the billing trigger commit together, so a recovery or repeated overdue event between 0050 and 0051 can use that preference. Only still-linked IDs can be restored on the same subscription, subject to its current capacity. Missing or inflated historical selections prompt a new choice when paid access returns and links exist. The capture waits up to two seconds for a conflicting lock. On timeout roll back the file and retry. Deploy `manage-ai-accounts` and `polar-webhook`. Wait for these versions to serve traffic, then apply 0051 and 0052 individually. An upgrade preserves the current selection, including when checkout replaces the Polar subscription ID, and prompts when another linked player can use a new slot.
3. After 0052 commits, deploy `analyze-player` with its shared dependencies. Deploy `analyze-deck`, `analyze-deck-builder`, `analyze-deck-advanced`, `analyze-match`, `generate-card-tips`, `predict-deck-matchup`, `predict-deck-performance`, `recommend-deck`, `suggest-card-replacements` and `analyze-meta-trends`. Publish the web client that sends the selected tag in deck requests. Confirm the deployed revision is serving traffic using the reader checks below. This reader and its fingerprint-based writer work on both sides of 0053.
4. Immediately before 0053, save a fresh result from the payment recovery and trial cohort query. Apply 0053 alone. It adds the nullable owner, guards new writes and replaces the read policies. Lock acquisition times out after two seconds. If it times out, roll back and retry during a quieter window. After commit, rerun the cohort query. For each open or scheduled experiment compare its observed eligibility with the pre-release projection. Compare the two saved-summary counts for every cohort in the new snapshot; they should agree. Record any population changes between snapshots. Monitor the API and database logs during the first 15 minutes after this commit as described below.
5. Apply 0054 alone. It attributes verified rows, atomically moves every other row into the private archive, and validates both ownership constraints. Readers and new inserts can continue. If the transaction fails, roll it back and retry 0054. Application roles cannot read the archive.
6. Apply 0055 alone. The validated check lets PostgreSQL make the column required without scanning the table under an exclusive lock. Run [the owner index statement](../scripts/sql/pr57-analysis-index.sql) as a single top-level command outside a transaction. The existing player-history index serves lookups during this build.

## Account impact

At **12:33:19 UTC on 24 November 2026**, the live Cloud database contained 354 analysis rows. Eleven had a verified account owner. The 343 scheduled for the private archive consisted of 304 tag-based profile summaries, 16 player API cache entries and 23 battle API cache entries. The number of over-capacity accounts with access was zero.

| Account measure | Unique accounts |
| --- | ---: |
| Paid subscribers with at least one linked player having only a legacy summary for that account | 8 |
| Of those paid subscribers, an affected player was selected and within the post-migration slot limit | 0 |
| Current trial users with an affected linked player | 0 |
| Accounts losing all previously accessible read-only summaries | 43 |
| Of those 43, expired or cancelled subscriptions | 37 |
| Of those 43, subscriptions in payment recovery | 6 |
| Accounts losing a read-only summary on one link and retaining a verified summary on another | 0 |

The query counts each account once per measure and matches verified history to both account and player. It includes the legacy profile-based trial when evaluating access and excludes admin access from customer cohorts. It checks both stored tag spellings for verified history. The old read-only handler looked up the player's link in its bare spelling before serving a legacy summary.

The paid cache on main already required the requesting account's UUID, matching evidence and language, and a result within 24 hours. Opening Coach Overview can cause a normal cache miss. The paid-account figure measures legacy-only history and does not predict extra generations from archiving. The read-only figure measures a change in what an account can retrieve while it has no generation access.

## Payment recovery and saved-summary baseline

At **13:52:07 UTC on 24 November 2026**, seven subscriptions were already past due. Six accounts had at least one link and enough slots for all links. One of those six had one enabled profile. It was also the only overdue account with any enabled profile, and its choice fit the slot limit. The previous overdue handler changed the billing status and timestamps. The flag records the effective selection at cutover; it does not establish who originally set it.

There were **zero active and zero planned return experiment windows**. Seventeen distinct non-test accounts were in `expired_winback`. All 17 met the current saved-summary condition and one met the verified-owner condition. These are eligibility counts on the same live data. Enrollment requires an open window and an actual call to `my_return_experiment()`. The measurement only reads the tables. For a planned window the query reports the audience at measurement time; remeasure when the window opens.

| Trial start range | Trial periods | Saved summary before 0053 | Projected with verified ownership |
| --- | ---: | ---: | ---: |
| Last 7 days | 8 | 5 | 1 |
| Last 30 days | 40 | 35 | 1 |
| Last 90 days | 49 | 44 | 1 |
| All history | 62 | 53 | 1 |

The [frozen weekly baseline](acceptance/account-boundaries/2026-11-24-trial-baseline.csv) contains every nonempty UTC trial-start week. Each period has the same admin and test exclusions as the default conversion report. Its `has_saved_summary` flag reflects the links and available summaries at query time. Changing the ownership rule therefore changes historical counts. The visible funnel's first-analysis step counts periods with trial AI usage; the recorded recommendation-viewed step uses its own event. Neither uses this flag.

## Checking migration history

The project's ordinary Lovable preview shares production services. Check each independently persisted test or staging database against its own ledger. Migrations 0050, 0052 and 0053 changed after `f7100de`; 0050 also changed after `6c2bd2e`. Compare each recorded SHA-256, where available, with the file in the revision being released. For example, run `shasum -a 256 drizzle/migrations/005{0,2,3}_*.sql` in that checkout. If an older 0050 ran there, check for an existing private preference before reconciling. Once the earlier 0051 has cleared a flag, recover its previous value only from a verified pre-cutover record. Otherwise let the account holder choose. These read-only catalog checks also help identify a partially applied target.

```sql
SELECT to_regprocedure('public.select_my_ai_profiles(uuid[])') IS NOT NULL AS selection_rpc,
  to_regclass('ai_royale_private.suspended_ai_selections') IS NOT NULL AS saved_preferences,
  to_regclass('public.verified_profile_summaries') IS NOT NULL AS scoped_reader,
  EXISTS (SELECT FROM pg_attribute WHERE attrelid='public.analyses'::regclass
    AND attname='user_id' AND NOT attisdropped) AS owner_column,
  to_regclass('ai_royale_private.unattributed_analyses') IS NOT NULL AS private_archive;
```

All five markers were absent on the live database at this measurement. A mismatched persisted database needs a forward reconciliation based on its actual objects and data. For a disposable rehearsal, provision a fresh database and replay the release there. Preserve the original ledger and any archive while reconciling.

## Verifying the serving Edge revision

Before 0053, check the rollout state of `analyze-player` and confirm that the previous revision has drained. On the deployed revision, find a **successful database read** in the function logs with message `Profile summary read`, source `verified_profile_summaries` and outcome `hit` or `miss`. The lookup field distinguishes `history` and `cache`. These success events use the info log level. A normal request from a team-owned lapsed account with a linked player exercises the history path without generating AI. Record the deployment revision and the time of the event. A single successful request establishes that the new reader ran. Use deployment or invocation records to confirm that it handles all traffic before committing 0053.

For the next 15 minutes, check **database or Data API logs** for `permission denied for table analyses` (SQLSTATE `42501`) and failed reads of `/rest/v1/analyses`. The old handler discarded the cache error and could still return HTTP 200 after a paid generation, or 403 on the history path. Also check the new handler's `Profile summary read` errors and verify that successful reads continue. If traffic is quiet, use the same team-owned history check again. If a stale reader appears, pause later stages, route requests to the verified revision and repeat the checks.

## Reconciliation

Check the committed data and index as the migration operator:

```sql
SELECT count(*) AS attributed, count(*) FILTER (WHERE user_id IS NULL) AS missing_owner
FROM public.analyses;
SELECT count(*) AS archived FROM ai_royale_private.unattributed_analyses;
SELECT i.indisready, i.indisvalid, pg_get_indexdef(i.indexrelid)
FROM pg_index i WHERE i.indexrelid = to_regclass('public.analyses_owner_player_history');
```

The missing-owner count must be zero. Allow for new analyses and account deletions since preflight when reconciling totals. A completed index must be ready, valid and match the supplied definition. If an interrupted concurrent build left this specific index invalid, drop that invalid index with `DROP INDEX CONCURRENTLY public.analyses_owner_player_history` outside a transaction and rerun the index statement. Preserve an already valid matching index.

Dream Arena uses the linked player as the participant for free and trial usage. The opponent remains a separate choice. The untagged meta screen reads the shared deck catalog and requires AI access. Tagged paid requests additionally require an enabled player slot.
