# AI Royale: day-two reminder, Coach history, pre-expiry summary email

This is the plan only. Nothing gets built, sent, scheduled or published until you approve it. Languages in all tests: **EN, TR, ES, FR, PT**.

## Checked live (read-only, observed 2026-11-15 14:12 UTC)
- The `trial-coaching-day-two` timer is active on `*/10 * * * *` with **42 runs** so far (as of 14:12 UTC). The 09:50:00 UTC run **succeeded**.
- UY02YVY9G (correct trial subscription): the opt-in points at UY's task. That task's status is **completed** (1–3). `attempted_at`, `sent_at` and `returned_at` are all **NULL**.
- So the 09:50 run left no attempt or send record for this subscription. The queue function only picks up pending tasks, so a completed task is never queued, and the sender writes no log line for it. The conclusion "not eligible because the task is completed" comes from: run succeeded + task completed + attempt/send empty.
- The sender checks that Resend returned an id but does **not** store it.

## Work order

| # | Work | Changes | Acceptance |
|---|---|---|---|
| 1 | Day-two zero-send proof (done above, read-only) | None | 09:50 run succeeded; task completed; no attempt/send → 0 emails |
| 2 | Make sends traceable | Nullable `resend_message_id` on `trial_coaching_followup`, written with `sent_at`; the Resend idempotency key stays | Unit test: id stored. If Resend accepts but the database write fails, a retry after the retry window creates no second email |
| 3 | Real day-two delivery | No changes; wait for one of our own trials to become eligible naturally. Watch from server records only, **without opening that player's Coach screen** before the send | Timer run + `sent_at` + message id + Resend "delivered" + exactly one email in the Fittechs inbox; the next tick sends nothing. **Only open item; waits for an eligible real trial** |
| 4 | Coach history | See below | See below |
| 5 | Pre-expiry summary email | See below | See below |

## Coach screen (accepted on its own)
- Today's card already shows the swap, the follow-up answer and the result. The new view makes clear, in order, **what was suggested → did I play it → what happened**.
- The current match and `previous_match` (at most one earlier match, kept when the recommendation changed) each appear with their own deck.
- With no match yet, it says "No matching match found". It never assumes the player hasn't played.
- Players see only tasks for their own linked tags. Nothing is rebuilt from older battles or free chat. Earlier-match history is reliable only from the 0011 release onward.
- Acceptance: desktop + mobile in five languages; a second account cannot see the data.

## Pre-expiry summary email (accepted on its own)
- **Consent:** separate from the day-two consent, **off by default**. It can be turned on for a completed or a pending task, and it can be withdrawn. It records the chosen task and player (when a subscription has two players).
- **Timing:** the same ten-minute timer, with its own one-send key per subscription (`summary_sent_at` + message id).
- **Checks right before sending:** correct subscription, linked player, consent still on, and `0 < time left ≤ 12h`.
- **Content:** from saved data only. It shows the swap, the score and the trophy change if saved, otherwise "No matching match found", plus the Coach link (sign-in, then the right player). The saved coach answer or its current translation is used only if it exists in the chosen language. Otherwise that paragraph is left out, so the email never contains text in another language. No new AI call.
- **Acceptance:** five languages; trial with renewal off → sends; paid → skip; consent withdrawn → skip; no task → skip; no match → "no match" wording; link opened signed out and after trial end; no second send on the next tick; Polar's upcoming-charge notice is unchanged.
