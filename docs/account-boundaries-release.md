# Releasing K1, K2 and K3

Use the live Lovable Cloud project linked from the README. Run the rollout in a low-traffic window. Each numbered migration file is atomic and must commit before the next file starts. Use the same migration ledger as the installation, recording each file only after a successful application. Keep the webhook and Edge versions paired with the stages below.

1. Check the migration history of the target database as described below. Before 0051 changes any flags, run [the read-only impact query](../scripts/sql/pr57-impact.sql). It returns counts of affected accounts and the archive inventory in a single snapshot. Repeat it immediately before release.
2. Apply 0050. Deploy `manage-ai-accounts` and `polar-webhook`. Wait for these versions to serve traffic, then apply 0051 and 0052 individually. A billing recovery restores the still-linked choices on the same subscription. An upgrade keeps the current selection, including when checkout replaces the Polar subscription ID. The player selection screen prompts when another linked player can use a new slot. If payment was already overdue before 0050, the account holder chooses again on recovery when linked profiles exist.
3. After 0052 commits, deploy `analyze-player` with its shared dependencies. Deploy `analyze-deck`, `analyze-deck-builder`, `analyze-deck-advanced`, `analyze-match`, `generate-card-tips`, `predict-deck-matchup`, `predict-deck-performance`, `recommend-deck`, `suggest-card-replacements` and `analyze-meta-trends`. Publish the web client that sends the selected tag in deck requests. Confirm the deployed revision is serving traffic using the reader checks below. This reader and its fingerprint-based writer work on both sides of 0053.
4. Apply 0053 alone. It adds the nullable owner, guards new writes and replaces the read policies. Lock acquisition times out after two seconds. If it times out, roll back and retry during a quieter window. Monitor the API and database logs during the first 15 minutes after this commit as described below.
5. Apply 0054 alone. It attributes verified rows, atomically moves every other row into the private archive, and validates both ownership constraints. Readers and new inserts can continue. If the transaction fails, roll it back and retry 0054. Application roles cannot read the archive.
6. Apply 0055 alone. The validated check lets PostgreSQL make the column required without scanning the table under an exclusive lock. Run [the owner index statement](../scripts/sql/pr57-analysis-index.sql) as a single top-level command outside a transaction. The existing player-history index serves lookups during this build.

## Account impact

At **12:33:19 UTC on 24 November 2026**, the live Cloud database contained 354 analysis rows. Eleven had a verified account owner. The 343 scheduled for the private archive consisted of 304 tag-based profile summaries, 16 player API cache entries and 23 battle API cache entries. The number of over-capacity accounts was zero. A separate live count found six already past-due accounts with at least one linked player and enough slots for all their links. On recovery without a recorded preference, the owner chooses which profiles receive AI access.

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

## Checking migration history

The project's ordinary Lovable preview shares production services. Check each independently persisted test or staging database against its own ledger. Migrations 0050, 0052 and 0053 changed after `f7100de`. Compare each recorded SHA-256, where available, with the file in the revision being released. For example, run `shasum -a 256 drizzle/migrations/005{0,2,3}_*.sql` in that checkout. These read-only catalog checks also help identify a partially applied target.

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
