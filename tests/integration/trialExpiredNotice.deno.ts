// Run with Deno. Renders the consent-free trial-ended notice in five languages and proves no sales copy remains.
import assert from 'node:assert/strict';
import * as React from 'https://esm.sh/react@18.3.1';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1';
import TrialExpiredEmail from '../../supabase/functions/send-email/_templates/trial-expired-email.tsx';

const sales = /\bPRO\b|subscribe|abone ol|suscr[ií]b|assin[ae]|abonnez|offer|teklif|oferta|offre|discount|indirim|descuento|desconto|réduction|%|missing|kaçır|perdiendo|perdendo|manquez|dominat|🤖|📊|🎯|⚔️/i;
const out: string[] = [];
for (const language of ['en', 'tr', 'es', 'fr', 'pt']) {
  const html = await renderAsync(React.createElement(TrialExpiredEmail, { language, appUrl: 'https://example.invalid' }));
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(html.includes(`lang="${language}"`), language);
  assert.doesNotMatch(text, sales, `sales copy in ${language}: ${text}`);
  out.push(`${language}: ${text.slice(0, 160)}…`);
}
const index = await Deno.readTextFile(new URL('../../supabase/functions/send-email/index.ts', import.meta.url));
const subjects = index.slice(index.indexOf('function getTrialExpiredSubject'), index.indexOf('function getWinbackPromoSubject'));
assert.doesNotMatch(subjects, sales, 'subject lines');
console.log(out.join('\n') + '\nPASS trial-ended notice: 5 languages, no sales copy');
