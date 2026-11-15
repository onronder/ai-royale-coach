# Backend release checklist

- [x] Confirm local backend files match main revision e967f4f506ed4d55408f5f6e91b694186ea92a74
- [ ] Apply 0009_trial_coaching_followup.sql once — blocked: migration tool rejects its Vault secret access; nothing was applied
- [x] Deploy trial-coaching-reminder, coach-chat, and first-session-coaching only
- [x] Verify cron absence, both Vault entries, Resend secret, and rejection of anonymous/invalid requests
- [x] Report UY02YVY9G task and trial timing/eligibility without email or IDs
- [x] Confirm deployment and SQL verification results; no UI, sends, notifications, timestamps, or data changes
- [x] Fix current preview type errors without changing runtime behavior — TypeScript passes and latest preview build is OK

# Coaching emails & Coach history (plan 2026-11-15)
- [x] Day-two zero-send proof for UY02YVY9G (09:50 run succeeded, task completed, no attempt/send)
- [x] Store email-service message id with each day-two send
- [ ] Real day-two inbox delivery — blocked: waits for one of our own trials to become eligible naturally
- [x] Coach card: "no matching match yet" wording + separate summary consent (EN/TR/ES/FR/PT)
- [x] End-of-trial summary email (opt-in, last 12h, once per subscription, no new AI call)
- [ ] Visual check of the Coach card and a real summary send — not yet done
