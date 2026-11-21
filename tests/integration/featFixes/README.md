# Chat completion and background cache acceptance

Uses actual React components/hooks with a real QueryClient. Backend responses
and streaming transport are synthetic; external requests and WebSockets are
blocked. Run with the fixture environment, never the Lovable preview.

Start the local app:

```sh
VITE_SUPABASE_URL=https://fixture.supabase.co \
VITE_SUPABASE_PROJECT_ID=fixture \
VITE_SUPABASE_PUBLISHABLE_KEY=fixture-test-key \
npm run dev -- --host 127.0.0.1 --port 5193 --strictPort
```

With Playwright 1.56.1 and Chromium installed outside the app dependencies:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
FIXTURE_URL=http://127.0.0.1:5193 \
node tests/integration/featFixes/browser.mjs
bun test tests/coachChatStream.test.ts
```

`SCENE=truncated` runs one chat scenario; `ONLY_BACKGROUND=1 SCENE=language`
runs one background scenario. `EVIDENCE_DIR=/absolute/path` optionally captures
English desktop and Turkish mobile save-error screens. Default run covers all
45 scenarios. Synthetic sessions are separate from production accounts.

See `docs/feat-fix-chat-background.md` for behavior and release limits.
