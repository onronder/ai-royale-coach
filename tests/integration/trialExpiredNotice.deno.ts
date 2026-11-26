// Render the service notice and check the copy used by the mixed end-of-access UI.
import assert from 'node:assert/strict';
import * as React from 'https://esm.sh/react@18.3.1';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1';
import TrialExpiredEmail, { getAccessEndedCopy } from '../../supabase/functions/send-email/_templates/trial-expired-email.tsx';

const sales = /\bPRO\b|subscribe|abone ol|suscr[ií]b|assin[ae]|abonnez|offer|teklif|oferta|offre|discount|indirim|descuento|desconto|réduction|%|missing|kaçır|perdiendo|perdendo|manquez|dominat|🤖|📊|🎯|⚔️/i;
const trialOrSavedPromise = /\btrial\b|deneme|\bprueba\b|\bessai\b|\bteste\b|saved|last analysis|kayıtlı|son analiz|guardad|último análisis|enregistré|dernière analyse|salvos|última análise/iu;
for (const language of ['en', 'tr', 'es', 'fr', 'pt']) {
  const copy = getAccessEndedCopy(language);
  const html = await renderAsync(React.createElement(TrialExpiredEmail, { language, appUrl: 'https://example.invalid' }));
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(html.includes(`lang="${language}"`), language);
  assert.ok(text.includes(copy.title) && text.includes(copy.preview), language);
  assert.ok(html.includes('https://example.invalid/settings'), language);
  assert.doesNotMatch(text, sales, language);
  assert.doesNotMatch(copy.preview + ' ' + text, trialOrSavedPromise, language);

  const messages = JSON.parse(await Deno.readTextFile(new URL(`../../src/i18n/locales/${language}.json`, import.meta.url)));
  const { trialEnded, subscription, selectPlayer } = messages;
  for (const label of [trialEnded.title, trialEnded.description, trialEnded.cta, subscription.trialExpired,
    subscription.trialExpiredDescription, subscription.trialExpiredPreview, selectPlayer.trialExpired]) {
    assert.equal(typeof label, 'string', language);
    assert.doesNotMatch(label, trialOrSavedPromise, language);
  }
  assert.equal(trialEnded.cta, subscription.viewPlans, language);
}
console.log('PASS end-of-access service notice and UI copy in five languages');
