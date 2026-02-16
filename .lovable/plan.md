

## Plan: GDPR-Compliant Subscription Cancellation

### Overview
Add the ability for users to cancel their subscription (both during Polar trial and active paid periods) directly from the Settings page. Cancellation calls the Polar API to cancel the subscription, which means Polar stops billing at the end of the current period. The webhook (`subscription.canceled`) already handles the database side.

---

### Part 1: New Edge Function -- `cancel-subscription`

**New file: `supabase/functions/cancel-subscription/index.ts`**

This function:
1. Authenticates the user via auth header
2. Fetches their `user_subscriptions` record to get `polar_subscription_id`
3. Calls the Polar API: `DELETE https://api.polar.sh/v1/subscriptions/{id}` with `Bearer POLAR_ACCESS_TOKEN`
4. Polar will then fire a `subscription.canceled` webhook (already handled in `polar-webhook`)
5. Returns success -- the webhook handles updating the database status to `cancelled`

```typescript
// Key logic:
const response = await fetch(
  `https://api.polar.sh/v1/subscriptions/${polarSubscriptionId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${polarAccessToken}`,
      'Content-Type': 'application/json',
    },
  }
);
```

**Config update: `supabase/config.toml`**
```toml
[functions.cancel-subscription]
verify_jwt = false
```
(Auth validated internally like other subscription endpoints)

---

### Part 2: Update `useSubscription` Hook

**File: `src/hooks/useSubscription.ts`**

Add a `cancelSubscription` mutation:
- Calls `supabase.functions.invoke('cancel-subscription')`
- On success, invalidates `subscription-status` query to refresh UI
- Returns: `cancelSubscription`, `isCancelling`

---

### Part 3: Update Settings Page -- Cancel Button

**File: `src/pages/Settings.tsx`**

Add to the Subscription card:
- **For trial users** (`status === 'trialing'`): Show a "Cancel Trial" button with amber styling and a confirmation dialog explaining that cancellation prevents billing at trial end
- **For active subscribers** (`status === 'active'`): Show a "Cancel My Subscription" button with a confirmation dialog explaining they keep access until the current period end date
- **For already-cancelled users** (`status === 'cancelled'`): Show "Cancellation pending" badge with the access-end date (no cancel button)

Confirmation dialog includes:
- Clear explanation of what happens (access until period end, no further charges)
- GDPR-compliant language: "Your data will be retained per our privacy policy. You can request data deletion at any time."
- Link to privacy policy

---

### Part 4: GDPR Compliance Details

The cancellation flow ensures GDPR compliance by:
1. **Transparency**: Clear explanation of what cancellation means before confirming
2. **Data retention notice**: Users are informed their data is retained per the privacy policy and they can request deletion
3. **Easy access**: Cancel button is prominently placed in Settings (not hidden)
4. **No dark patterns**: Single confirmation dialog, no guilt-tripping copy, no unnecessary friction
5. **Right to erasure reference**: Links to privacy policy which should outline the data deletion request process

---

### Part 5: Translation Keys (all 5 languages)

New keys added to all locale files under `settings.subscription`:

| Key | English |
|-----|---------|
| `cancelTrial` | Cancel Trial |
| `cancelSubscription` | Cancel My Subscription |
| `cancelConfirm.title` | Cancel Subscription? |
| `cancelConfirm.trialDescription` | If you cancel now, you won't be charged when your trial ends on {{date}}. You'll keep access until then. |
| `cancelConfirm.activeDescription` | Your subscription will remain active until {{date}}. After that, AI features will be disabled. You won't be charged again. |
| `cancelConfirm.gdprNotice` | Your data will be retained per our privacy policy. You can request data deletion at any time. |
| `cancelConfirm.confirm` | Yes, Cancel |
| `cancelConfirm.keep` | Keep Subscription |
| `cancellationPending` | Cancelled -- access until {{date}} |

---

### Part 6: Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/cancel-subscription/index.ts` | New edge function calling Polar API to cancel subscription |
| `supabase/config.toml` | Register `cancel-subscription` with `verify_jwt = false` |
| `src/hooks/useSubscription.ts` | Add `cancelSubscription` mutation and `isCancelling` state |
| `src/pages/Settings.tsx` | Add cancel button with confirmation dialog in Subscription card |
| `src/i18n/locales/en.json` | Add cancel-related translation keys |
| `src/i18n/locales/es.json` | Add cancel-related translation keys |
| `src/i18n/locales/pt.json` | Add cancel-related translation keys |
| `src/i18n/locales/tr.json` | Add cancel-related translation keys |
| `src/i18n/locales/fr.json` | Add cancel-related translation keys |

### What's NOT Changed
- `polar-webhook/index.ts` -- already handles `subscription.canceled` and `subscription.uncanceled` events correctly
- `get-subscription-status` -- already returns `cancelled` status with period end date and grants access until expiry
- No database migrations needed

