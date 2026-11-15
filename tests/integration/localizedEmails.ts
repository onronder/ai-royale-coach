// Run with Deno. These checks render HTML and never contact the mail provider.
import assert from 'node:assert/strict';
import * as React from 'https://esm.sh/react@18.3.1';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1';
import { supportedLanguages } from '../../supabase/functions/_shared/language.ts';

const templates = ['welcome', 'subscription', 'password-reset', 'trial-expired', 'winback-promo', 'payment-failed', 'cancellation', 'verification'];
const exampleUrl = 'https://example.invalid';
const props = {
  accountSlots: 1, renewalDate: '2026-11-15', accessEndDate: '2026-11-15',
  site_url: exampleUrl, supabase_url: exampleUrl, redirect_to: exampleUrl,
  token_hash: 'sample', token: 'sample', appUrl: exampleUrl, resetUrl: exampleUrl,
  updatePaymentUrl: exampleUrl, promoCode: 'SAMPLE', discountPercent: 10,
};
let count = 0;
for (const name of templates) {
  const url = new URL('../../supabase/functions/send-email/_templates/' + name + '-email.tsx', import.meta.url);
  const { default: Email } = await import(url.href);
  const distinctBodies = new Set<string>();
  const actions = name === 'verification' ? ['signup', 'magiclink', 'recovery'] : ['signup'];
  for (const language of supportedLanguages) {
    for (const action of actions) {
      const html = await renderAsync(React.createElement(Email, { ...props, language, email_action_type: action }));
      const variant = [name, language, action].join('/');
      assert.ok(html.includes('lang="' + language + '"') && html.includes('</html>'), variant);
      assert.doesNotMatch(html, /\bundefined\b|\{\{\w+\}\}/, variant);
      const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
      assert.ok(!distinctBodies.has(text), 'Duplicate localized message: ' + variant);
      distinctBodies.add(text);
      count++;
    }
  }
}
assert.equal(count, 50);
