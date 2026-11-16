# Plan: Marketing email preferences and privacy foundation (isolated draft)

## How the work runs
- On approval, I create a separate **draft** of the project with its own empty test database. All code, schema changes and tests live there. The live backend, the main project and the live site stay untouched.
- Starting point: the main project's latest saved version. I record its revision in the delivery notes.
- I can't open a GitHub pull request myself. The draft is the separate change set, and its GitHub branch/PR comes from your GitHub sync. I'll report its starting revision and contents so the PR can be matched to it.
- Out of scope: live database changes, real sends, copying contacts to Resend, bulk actions on existing users, scheduled campaigns, the November campaign, merging and publishing.
- Tests use synthetic accounts and a fake email service. I'll also prove the tests cannot reach the live backend, Resend, Polar or analytics.

## 1. What the player sees
- **Sign-up checkbox:** a separate checkbox, unticked by default and apart from the terms. TR wording: "Fittechs Yazılım Anonim Şirketi'nin AI Royale indirim ve kampanyalarını e-postayla almak istiyorum." It says the checkbox is optional, explains how to opt out, and links to the privacy notice. Same scope in EN, TR, ES, FR and PT.
- **Email sign-up:** ticking the box only creates a *pending* choice. Consent becomes valid once the address is confirmed and the signed-in player completes "Kampanya e-postalarını almak istiyorum" themselves. Confirming the address, repeating sign-up or refreshing the page never grants consent on its own. No second confirmation email.
- **Google:** on first sign-in, the confirmed address plus the player's explicit choice is enough. Signing in again changes nothing.
- If the preference service fails, sign-up, payment and coaching still go ahead.
- **Coach invite:** trial players who were never asked see one optional, dismissible invite. It is not a "missing consent" warning. Whether it was shown is stored per account and kept apart from the consent record. More devices or player tags don't repeat it. Players who left the box empty, dismissed the invite or withdrew can still change their mind on the preferences page.

## 2. Proof of consent and preference management
- The server works out the account and its current confirmed address from the session. Each explicit choice stores brand, purpose, channel, source screen, server time, language and an unchangeable version of the wording. The full local text for that version can be read back later.
- A pending choice is tied to the same account and address. If the address changes or the pending choice expires, it can never activate. Consent is never backdated.
- These never turn into marketing consent: accepting the terms, membership, earlier email deliveries, match usage, or the two coaching-email permissions.
- History is append-only. The app can't write to it directly, only through checked server actions. A repeated request creates one event. An old tab or a late confirmation can't override a newer withdrawal. Admins cannot consent on a player's behalf. Each table, view and server action gets only the permissions it needs.
- The **email preferences page** stays open after a subscription ends. Each future campaign email gets a secure one-click unsubscribe that needs no sign-in. Opening the link only shows a page and changes nothing until the player confirms, so automatic link scanners can't change anything. Repeating an unsubscribe succeeds and does no harm. Load and save errors show the correct state in five languages with a retry, and an unknown outcome never shows success.

## 3. Protecting existing campaign paths
- The winback promo path (Winback panel → send-email `winback_promo`) gets the consent gate inside the existing server sender. The result is the same from the admin screen, a direct call, a bulk run or a retry.
- Just before handing an email to the provider, the server rechecks: sender permission, the recipient's current confirmed address, valid consent, no withdrawal or objection, no provider block or complaint, the market rule that applies, and a global "campaign sending enabled" switch. If unsure, it doesn't send. Blocked or uncertain sends never show as sent. A retry of the same campaign to the same recipient makes at most one message, using the existing reliable send mechanisms.
- Template review: `trial_expired` currently contains a sales pitch and "Subscribe to PRO". Players without consent get a plain version covering only the expiry, their access status and any account action needed. The promotional version, if kept, has to pass the gate. Verification, payment, cancellation and coaching emails (each under its own preference) keep working.
- The campaign switch stays **off** in this work. It is turned on only inside the test environment, only to prove the gate.

## 4. International scope and data rights
- One shared consent system for every market. Residence is never inferred from IP, interface language or email domain, and name, birth date or raw IP are not collected for this feature. If a campaign needs a country or age and there's no reliable data or approved rule, that campaign waits while the game keeps working. Turkey-specific IYS steps are applied to the actions they cover; no live IYS connection.
- **Data rights:** reuse the existing privacy, request and account deletion paths (Settings, Privacy). Add a verifiable request route for access, correction, deletion, portability (where it applies) and objection/restriction, plus simple admin tracking: received time, owner, legal deadline, outcome and reply date. People who can't sign in can use the existing verifiable contact route. Players never see another account's requests.
- **Retention table:** for each data type, its purpose, retention reason, period or the rule that sets it, and how it's deleted. Periods the company hasn't decided are left marked "decision needed". Account deletion keeps only the minimum records that have a valid basis and period. A deleted or reopened account never inherits old consent.
- **Data-flow map:** match the code and configuration to show what goes to the backend, Resend, Polar, analytics and AI providers, and why. Anything that can't be verified is left open. Marketing consent doesn't allow ad profiling. Any California sale or sharing gets reported, with Global Privacy Control if it's needed.

## 5. Admin report
- Admin → Trials shows three separate columns: **preference at trial start**, **preference today** and **can receive campaigns today**. When sending is off, the third column says so.
- The trial-start snapshot is tied to the trial/subscription's permanent ID and to consent at the real trial start. Late or duplicate Polar notices and a second trial on the same account can't change past rows. Older starts with no proof show as "unknown". Several player tags on one account still count as one account.

## 6. Acceptance evidence (delivered from the draft)
- Tests against the real database rules in the isolated database and the real send code with the fake provider. They cover: empty checkbox, address confirmation only, explicit consent, three sign-ups with one address, Google first and repeat sign-in, address change, double click, a stale consent from a second tab, a late request after withdrawal, and cross-account access.
- An older trial on two devices sees one invite. An expired player can withdraw. The fake provider gets zero sends for a campaign withdrawn while pending, a direct admin call without consent, and a blocked address. In the positive test with sending switched on, a retry of an eligible campaign shows exactly one accepted message.
- The no-consent trial-expired email is rendered in five languages with no sales copy. Existing verification, subscription and coaching tests are run again. The trial-start report is tested with a late notice and two trials on one account.
- Screenshots of sign-up, the Coach invite, the preferences page and the admin report in five languages, mobile and desktop. Checks: keyboard sign-up works without ticking the box, and no visible translation keys, wrong-language errors or mobile overflow.
- The final report has these parts: passed and remaining tests, screenshots, open company decisions, which markets and actions are ready to go live, and a safe release order (GitHub merge, live backend, site publication as separate steps).

## Company decisions (don't block development)
Target countries; child players and the parental consent rule; company and contact details; legal basis for international transfers; retention periods; final wording in five languages; the IYS owner for the relevant market.

## Technical details
- `drafts--create` with the full scope above as its first instruction. All migrations go only to the draft's database.
- New objects: `marketing_consent_text_versions` (immutable text per language/version), `marketing_consent_events` (append-only, written by security-definer RPC only), `marketing_consent_pending` (account+address bound, expiry), `marketing_invite_impressions` (per account), `campaign_send_attempts` (unique per campaign+recipient), `data_rights_requests`, `trial_consent_snapshots` (unique per Polar subscription ID, insert-once), plus a `campaign_sending_enabled` setting.
- RPCs: `record_marketing_choice`, `activate_pending_consent`, `withdraw_marketing_consent`, a token-based unsubscribe, and `can_send_campaign(user, campaign)`, called from `send-email` before the provider. Ordering is by server sequence, so stale requests lose to newer withdrawals.
- Tests: the throwaway Postgres harness in `tests/integration/` with the fake provider and network isolation, plus Playwright screenshots.
