# Plan: Five-language email preference and privacy foundation (separate PR, isolated environment)

## Scope and guardrails
- Work happens in a separate draft with its own isolated database. Preview and the live site share a backend, so nothing touches the live backend until the owner approves a release.
- In this PR: no real email sends, no copying existing users into Resend, no live release. Connecting to IYS (Turkey's permission registry) is **not** required for this PR.
- Existing trial, payment, coaching and match flows must not change.

## 1. Sign-up and trial experience
- Email sign-up and first Google sign-in show a separate optional checkbox for AI Royale marketing emails. It starts unticked.
- Consent counts only once the email address is confirmed, and is tied to that account and address.
- Current trial players who were never asked see a dismissible invite once, on the Coach screen.
- Players who left the box unticked, dismissed the invite or withdrew consent are never asked again automatically.
- Whatever the player chooses, sign-up, payment, coaching and match results work exactly the same.

## 2. Preference records that can be proven
- Each event is stored as an append-only record: account, confirmed address, brand, channel, purpose, server time, source screen, language and the version of the wording shown.
- Consents and withdrawals never overwrite each other. The current state is read from the latest record.
- One account counts once, however many player tags it has.
- Existing players do not get consent backdated.
- Country of residence is never guessed from IP, app language or email domain. Full name, birth date and raw IP are not collected globally unless a specific market is confirmed to require them.

## 3. Player data rights
- Review the existing account, privacy and deletion flows first and reuse whatever already works.
- An email preferences page stays available after the subscription ends, with one-click withdrawal.
- Signed-in players can request access, correction, deletion and (where it applies) export of their data. Each request is tracked, with a simple admin queue to work through them.
- Each data type gets a retention reason table. The account deletion result explains legal exceptions accurately (for example invoices and proof of consent).

## 4. Actual data flows
- Using code and configuration, map which personal data goes to the backend, Resend, Polar, analytics and the AI providers, and why.
- Marketing consent does not allow ad profiling from gameplay or sharing with ad partners.
- If any California "sale/sharing" or targeted advertising turns up, list an opt-out and Global Privacy Control support as a separate follow-up task.

## 5. Send gate and admin report
- A server-side check for future promotional sends: current consent, no withdrawal, no provider block, and any country rules that apply. In this PR it is only built and tested. Nothing calls it to send.
- Turkey: live collection of in-scope consents waits for the IYS process and its legal deadlines. The design keeps an IYS hook but does not block other markets.
- Admin → Trials gets three separate columns: **preference at trial start**, **preference today** and **can receive campaigns today**. The trial-start snapshot is linked to that trial.

## 6. Acceptance evidence
- Mobile and desktop screenshots in TR, EN, ES, FR and PT.
- Tests with synthetic accounts in the isolated database: no consent, duplicate sign-up, address change, conflicting choices from two devices, withdrawal after the subscription ends, account deletion, and a blocked send to a withdrawn address.
- The final report has three separate parts: (a) features that work and were tested, (b) decisions the company must make, (c) what will be switched on at go-live.

## Decisions needed from the company
- Target countries and the order of rollout.
- Age limit for child players and the parental consent rule.
- Legal basis for international transfers (Resend, Polar, AI providers) and the company details for the privacy notice.
- Who owns the IYS process, and whether it will be manual or a system connection.
- Final consent wording in all five languages.

## Technical details
- Create a draft with its own database and apply migrations only there.
- New tables: `marketing_consent_events` (append-only, RLS: owner reads own rows, inserts only through security-definer RPCs) and `data_rights_requests` (owner creates and reads own, admins manage). `trial_consent_snapshot` is linked to the subscription/trial. Every table gets GRANTs.
- RPCs: `record_marketing_consent`, `current_marketing_consent` (view) and `can_send_marketing(user)` as the send gate. A trigger on email confirmation activates any pending sign-up consent.
- UI: checkbox on `/auth` plus a post-OAuth prompt, a Coach invite card, a preferences page reachable without an active subscription, and an Admin Trials panel.
- Integration tests use the throwaway Postgres harness already in `tests/integration/`, plus Playwright screenshots in five languages.
