# Fixes: What's New, account selection cards, trial end behaviour

## 1. What's New window
- Remove the duplicate close (X): keep the built-in dialog close only, delete the custom one.
- Show once per release: the window opens automatically only the first time a user sees a release. After closing (X, outside click, "Got it", or a CTA button) it never reopens until a new release is published. Settings "What's New" button still opens it manually.
- Remember it per account (saved to the user's profile) plus on the device, so it does not reappear on other devices/browsers or after logging in again.
- Release identifier is derived from the newest announcement, so adding a new feature automatically shows it again once.

## 2. Account selection cards (Select Player page)
Rebuild card layout for consistent quality on phone, iPad and desktop:
- Fixed avatar size per breakpoint (phone 56px, tablet 64px, desktop 72px), vertically centred with the text block.
- Text block: line 1 name + tag + trial badge (wraps cleanly, name truncates instead of pushing badges); line 2 trophies / arena / clan as evenly spaced chips with consistent icon size; line 3 "last used".
- Equal card padding and height, no empty bottom space; delete button aligned centrally on the right for every card (not only last), with hover/visible state on touch devices.
- "Last used" localized (currently "1 minute ago" in English on Turkish UI).
- Trial banner at the top aligned with the same width and vertical centring.
- Verified with screenshots at 390px, 820px and 1440px widths.

## 3. Trial end behaviour (change from current)
- During trial: first analysis starts automatically (already built), 1 shared AI analysis per 24h stays.
- When the Polar trial ends without payment: user can still open their player page and sees the last saved analysis (read-only), plus a banner "Your trial has ended" with a "Subscribe again" button opening checkout.
- No new AI analysis can run: refresh/analyse buttons are disabled with the same notice, and the server keeps rejecting AI requests (unchanged enforcement).
- Other paid areas (Oracle, Dream Arena, etc.) keep showing the subscribe screen.

## 4. End-to-end verification with a trial account
- Create a temporary test account with a trial subscription and a linked tag, sign in, confirm the first analysis starts automatically and a second one is refused within 24h.
- Move the test trial end date into the past, confirm: last analysis still visible, banner + subscribe button shown, new analysis refused by the server.
- Remove the test account data afterwards and report results with screenshots.

## Technical details
- `WhatsNewModal`: remove custom button; dismiss via one `onOpenChange`. `useWhatsNew`: version = latest feature id; store in `profiles` new column `whats_new_seen_version` (migration) + localStorage; only Dashboard auto-opens (Settings opens manually).
- `SelectPlayer.tsx` card: CSS grid `grid-cols-[auto_1fr_auto]`, `min-w-0` + `truncate`, responsive sizes via `sm:`/`lg:`, date-fns locale from i18n.
- Route gate: allow `/player/:tag` in read-only mode for expired Polar trials (`trial_expired` state from `get-subscription-status`); `usePlayerAnalysis` loads cached analysis from `analyses` without calling AI; new `TrialEndedBanner` with resubscribe CTA; 5 locale keys.
- `checkAiAccess` unchanged (expired trial => blocked).
