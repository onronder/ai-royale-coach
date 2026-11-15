# AI Royale: day-two reminder check, Coach history, and pre-expiry summary email

The planning brief only. Nothing gets built, sent, scheduled or published until you approve.

## Checked live today (read-only)
- The `trial-coaching-day-two` timer is active on `*/10 * * * *`. It has run 41 times. Its last run, at 14:00 UTC, succeeded.
- The sender sends through Resend and checks that Resend returned an `id`. It does not save that id. It saves only `sent_at`.
- The Coach task card (`FirstSessionTask.tsx`) is the only screen that reads `previous_match` and the follow-up fields.
- Still open (not verified live): the per-run sender logs, Resend delivery status, and any real inbox delivery.

## Work order

| # | Work | Screen / data changes | Acceptance (EN, TR, ES, PT, DE) | After release |
|---|---|---|---|---|
| 1 | Check the day-two flow for UY02YVY9G (read-only) | None | Correct trial subscription, opt-in pointing at UY's task, inside the 24–48h window, task already completed at 1–3, no sent or attempted record → **expected: 0 emails**, skip reason "task not pending". Report the scheduler run and the sender log for the same tick. | Confirm `sent_at` stays empty after the 09:50 UTC tick and the ticks after it |
| 2 | Make each send traceable (smallest change) | Add a nullable `resend_message_id` column to `trial_coaching_followup`. Store it in the same update as `sent_at`. The Resend idempotency key stays as it is. | Unit test: the id is stored. A second run sends nothing. | Use it only when a real delivery happens |
| 3 | Real delivery test | No changes; wait for one of our own accounts to become eligible naturally | Four pieces of evidence: timer run, `sent_at` + message id, Resend shows "delivered", exactly one message in the Fittechs inbox. The next tick sends nothing. | **Stays open until a real trial is eligible** |
| 4 | Coach history (can be accepted separately) | A "What was suggested / Did I try it / Result" panel in the existing Coach task card. It shows the swap, the follow-up question and answer, the current result, and `previous_match` when it exists. It reads only through the existing task access for your own linked tag. Nothing is guessed from older battles or free chat. | Desktop + mobile, all five languages; a second account cannot see the data | Screenshot check of one real task |
| 5 | Pre-expiry summary email (can be accepted separately) | Separate consent (`summary_opted_in_at` and related fields). One send per subscription (`summary_sent_at` + message id), only in the last 12h before the real trial end. The email is built from saved data only: the swap, the follow-up answer, the match score, and the trophy change if saved. "No match yet" if there is none. If there is no task, it is skipped. The link goes to sign-in, then that player's Coach screen. Existing translations are reused; nothing is generated again by AI. The ten-minute timer gets one extra check (no new duplicate job). | Cases: trial with renewal off → sends; paid → skip; consent withdrawn → skip; no task → skip; no match → "no match" wording; five languages | Watch the first natural send; Polar's upcoming-charge notice stays separate |

## Technical notes
- History from item 4 is reliable only from the `0011` release onward (the `previous_match` trigger). Matches before that are not rebuilt.
- The summary email has its own consent. The day-two consent covers only the unfinished-task reminder.
- No manual bulk sends and no edits to existing scores, consent or trial dates at any step.
