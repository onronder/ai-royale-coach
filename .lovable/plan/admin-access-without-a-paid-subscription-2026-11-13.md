# Admin access without a paid subscription

## What I found
- o.onder@fittechs.com already has the **admin** role.
- The subscription record is **expired** (ended Nov 7, 2026), so the paywall blocks the whole app, including /admin.

## What changes
- Admins always get full access to the app, /admin included, even without an active subscription.
- This works for every admin account, not just this one email, so no database edits are needed and a Polar webhook can't overwrite it later.
- Non-admin users see no change: the 72-hour trial and paywall rules stay as they are.

## Technical details
- In the `get-subscription-status` edge function, call the `is_admin(auth.uid())` RPC. If it returns true, send back `hasAccess: true`, generous account slots (for example 10) and the existing subscription and trial fields, then redeploy.
- The check runs on the server and reads the protected `admin_roles` table, so a client can't fake it.
- Search the other edge functions (AI chat, analysis and so on) for their own subscription checks and add the same admin bypass where one exists.
- Leave the existing `user_subscriptions` row untouched.

## Verification
- Call the function as this admin and confirm it returns `hasAccess: true`.
- Open /admin and one app page with the admin session.
