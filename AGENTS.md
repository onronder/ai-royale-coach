## Page layout
- Dream Arena opponent selection uses the shared AppSidebar and DashboardHeader; cinematic loading and battles remain full-screen to preserve the match experience.
- On player selection, a live Polar trial with exactly one linked tag and no recorded trial AI usage opens that player once per account (localStorage flag); otherwise the user picks.
- Subscription access is decided only by `supabase/functions/_shared/subscription-access.ts` (used by get-subscription-status and ai-access); cancellation uses Polar `cancel_at_period_end`, never DELETE, so users keep what they were promised until the period end.
- Coaching tasks are server-owned and unique per user/player; only a battle after the recommendation was seen with the exact recommended eight-card deck completes the task, preventing stale or cross-account results.
- Trial generations use atomic reservations and commit usage only on success; automatic profile summaries and the task's one follow-up are exempt so the first-session loop remains completable.
- Profile and battle cache freshness use independent timestamps and endpoint-specific atomic writes so concurrent refreshes cannot hide stale battle data.
