# Quality and Lovable publication

Main must require an up-to-date PR and the `quality` check from GitHub Actions
(app 15368), including for admins. No force pushes, deletion or PR bypass.
The single unconditional quality job covers unit/handler tests, types, production
build, bundle budget and isolated browser acceptance. Never rename it without
updating the required check. Zero required peer approvals permits the sole owner
to merge, but does not exempt that owner from CI.

## Working with Lovable

Develop on a draft/feature branch and open a PR into main. If Lovable cannot push
to protected main, it preserves the work on `lovable-sync` (or a timestamped
variant); review that branch via a PR. Do not remove protection or give the app
a bypass. Merge normally, without squash/rebase or resetting main, to preserve
Lovable history. Official behavior:
https://docs.lovable.dev/integrations/github#project-repository-issues

## Publication procedure

1. Wait for PR quality and merge normally. Wait for the separate push-to-main
   quality run; a passing PR run alone is not publication acceptance.
2. Run `node scripts/check-release.mjs <full-main-sha>`. It checks the current
   main revision, protection and successful main quality. Save its output.
3. In Lovable confirm main is synchronized, with no unpublished branch-only
   edits or outstanding sync conflict. Keep the repository version only after
   reviewing any saved Lovable work. Refresh preview and check the changed UI.
4. Re-run the preflight immediately before Publish → Update. If the source
   changes, restart at step 1. Record publication separately from merge.
5. Verify the live assets/changed behavior and record the acceptance result.
   Keep campaign sending off and do not create paid AI requests for smoke tests.

GitHub enforces the merge gate. The script is a read-only operator preflight:
it cannot disable Lovable's manual Publish button or attest to unpublished
Lovable edits. Do not describe this as an automated Lovable deployment gate.

## This closure

- Chat cursors retain the server's full microsecond timestamp, validated before
  embedding in a filter. No schema, retention or backend changes are required.
- Regression covers 70 messages (50 + 20), timestamp ties and different
  microseconds within one millisecond, 35 days and three timezones.
- Help uses the existing translated subtitle as its accessible description;
  the five-language browser check fails on missing-description warnings.
- First-task acceptance must be a real live stored-task load, recorded separately
  from fixture tests. Do not infer it from a database row alone.
