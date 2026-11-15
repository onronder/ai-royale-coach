# Backend release checklist

- [ ] Confirm local backend files match main revision e967f4f506ed4d55408f5f6e91b694186ea92a74
- [ ] Inspect and, if needed, apply 0009_trial_coaching_followup.sql once
- [ ] Deploy trial-coaching-reminder, coach-chat, and first-session-coaching only
- [ ] Verify cron, Vault entries, Resend secret, and rejection of anonymous/invalid requests
- [ ] Report UY02YVY9G task and trial timing/eligibility without email or IDs
- [ ] Confirm deployment and SQL verification results; no UI or data changes
