# Player selection page: stop auto-redirect and fix card layout

## 1. Stop being sent to the player page automatically
**Cause:** the page sends trial accounts straight to their first player when no trial AI use is on record. If that first analysis never gets recorded (for example, it fails or is still running), the redirect happens on every visit, so you can't pick a player.

**Fix:**
- Redirect only once per account, right after a new trial starts (coming back from checkout, or on the first visit). After that, the page always lets you choose.
- Remember the redirect per account so refreshing or coming back doesn't trigger it again.
- Never redirect when the account has more than one player tag. The person picks; the first analysis starts on the player they pick.
- Clicking a card always opens that player.

## 2. Card layout and proportions (phone, iPad, desktop)
- Fixed square badge on the left, text in the middle, actions on the right, all centred vertically.
- Name on one line with "…" when it's long. Tag and role badges go on a second line so they don't push the name around.
- Stats (trophies, clan, last used) in an even row that wraps neatly on narrow screens, with consistent icon sizes and spacing.
- Same card height for every player. Padding grows step by step at phone, tablet and desktop widths.
- The "Add player" box and the empty state match the card widths and corner styles.
- Check with screenshots at 375, 768, 1024 and 1280 px widths, using an account with 2 or more player tags.

## Technical details
- `src/pages/SelectPlayer.tsx`: guard the auto-navigate effect with a per-user localStorage flag (`auto-trial-redirect:<userId>`), require `profiles.length === 1`, and set the flag before navigating.
- Update `firstTrialAnalysisTag` and its test to cover the "single tag only" rule and the "already redirected" flag.
- Restyle the card component in `src/components/player/PlayerTagSelector.tsx` using semantic tokens only.
