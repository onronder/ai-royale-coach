# Releasing K1, K2 and K3

Use the live Lovable Cloud project linked from the README. Run the rollout in a low-traffic window. Each numbered migration file is atomic and must commit before the next file starts. Use the same migration ledger as the installation, recording each file only after a successful application. Keep the webhook and Edge versions paired with the stages below.

1. Before 0051 changes any flags, run [the two read-only counts](../scripts/sql/pr57-impact.sql). Record the time, accounts over capacity, attributable rows and rows to archive. On 24 November 2026 at 10:14:49 UTC, the Cloud query returned 0 accounts, 354 analyses, 11 attributable and 343 to archive. The table and indexes occupied 2,514,944 bytes. Repeat the counts at release because customers can add data.
2. Apply 0050. Deploy `manage-ai-accounts` and `polar-webhook`. Wait for these versions to serve traffic, then apply 0051 and 0052 individually. A billing recovery restores the still-linked choices on the same subscription. An upgrade keeps the current selection and opens the existing selector when another linked player can use a new slot. Billing records already in payment recovery before 0050 have no saved selection to restore.
3. After 0052 commits, deploy `analyze-player` and the other changed player and meta handlers with their shared dependencies. Confirm a verified owner's saved summary is readable via the new service-only view. This reader and its fingerprint-based writer work on both sides of 0053. Wait for the new reader to serve traffic before revoking raw service reads in 0053.
4. Apply 0053 alone. It adds the nullable owner, guards new writes and replaces the read policies. Lock acquisition times out after two seconds. If it times out, roll back and retry during a quieter window. Do not proceed while the old reader is still serving traffic.
5. Apply 0054 alone. It attributes verified rows, atomically moves every other row into the private archive, and validates both ownership constraints. Readers and new inserts can continue. If the transaction fails, roll it back and retry 0054. Application roles cannot read the archive.
6. Apply 0055 alone. The validated check lets PostgreSQL make the column required without scanning the table under an exclusive lock. Run [the owner index statement](../scripts/sql/pr57-analysis-index.sql) as a single top-level command outside a transaction. The existing player-history index serves lookups during this build.

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
