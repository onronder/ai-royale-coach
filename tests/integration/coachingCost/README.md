# PR #30 provider pilot (explicit opt-in)

The default command is offline and makes no calls:

```sh
node tests/integration/coachingCost/run.mjs
```

`catalog.json` contains public card identities with synthetic level-13 values,
not a player's tag, account or collection levels. `prompts.json` captures the
exact old prompt templates from `5cfb6a4` and new templates from `cfbaf19`, plus
their unchanged system prompt. The runner uses the installed Vercel AI SDK with
the existing model/options. Unlike customer handlers, it has no database client
and cannot consume an account's entitlement.

Real execution requires explicit authorization and a private environment already
containing the gateway key. Never export that key to logs, chat or Git:

```sh
BENCHMARK_CONFIRM=pr30-16-requests \
BENCHMARK_OUTPUT=/tmp/pr30-provider-results.jsonl \
node tests/integration/coachingCost/run.mjs --run
```

The output path must not exist. Requests are sequential, capped at 16, alternate
old/new order, and have no automatic retries. Each attempt is recorded before
sending; after interruption retain the file and inspect partial results rather
than restarting the batch. Failures or excessive output stop remaining requests.
Registry/package installation and development-agent credit use are separate from
these 16 AI requests. Do not infer a hard dollar ceiling from a request cap.

Eight pairs cover five languages, free suggestions, trial/paid keep/swap choices,
unknown and low card levels, and alternative/guaranteed-win follow-ups. Automated
checks cover response structure and card eligibility; human review must also
check language, tactical usefulness, unobserved-gameplay claims and promises.
Provider credits must be matched by response/run ID, not inferred from token or
character reductions. This small pilot cannot establish a statistical p95 or
guarantee quality on every deck.

The same runner can be bundled for a secure hosted shell by replacing the two
JSON file reads with their literal JSON contents. Verify the bundle hash before
executing; no endpoint, deployment or customer write is required for the pilot.
