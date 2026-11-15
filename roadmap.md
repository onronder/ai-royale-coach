# Backend release checklist

- [x] Confirm local backend files match main revision e967f4f506ed4d55408f5f6e91b694186ea92a74
- [ ] Apply 0009_trial_coaching_followup.sql once — blocked: migration tool rejects its Vault secret access; nothing was applied
- [x] Deploy trial-coaching-reminder, coach-chat, and first-session-coaching only
- [x] Verify cron absence, both Vault entries, Resend secret, and rejection of anonymous/invalid requests
- [x] Report UY02YVY9G task and trial timing/eligibility without email or IDs
- [x] Confirm deployment and SQL verification results; no UI, sends, notifications, timestamps, or data changes
- [x] Fix current preview type errors without changing runtime behavior — TypeScript passes and latest preview build is OK
