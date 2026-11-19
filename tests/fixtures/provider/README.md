# Historical provider-shaped samples

`battles-2026-11-18.json` was extracted from the isolated restored rehearsal's
`player_cache`, read-only on 19 November 2026. It is not a new provider request.
Player tags/names/times were replaced; clans and identifying metrics were removed.
Card IDs, names, levels, evolution fields, tower cards and participant shape were
retained. Round details retain only crowns. Image URLs were removed; browser
fixtures add a local placeholder without changing the production component.

The private source contained 112 cache rows and 2,485 battle payloads, including
87 two-by-two, four duel and 45 multideck payloads. Counts are cache observations,
not globally unique matches. Source hash and aggregate capabilities are recorded
in `docs/correctness-platform-acceptance.json`; no raw customer data is committed.

No `heroLevel` or `activeForm` field was observed. These samples do not establish
active Hero/evolution slots or match-event telemetry; those remain unknown.
