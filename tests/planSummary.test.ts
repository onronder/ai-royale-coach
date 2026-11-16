import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import i18next from 'i18next';
import { planSummary } from '../src/lib/planSummary';

const languages = ['en', 'tr', 'es', 'fr', 'pt'] as const;
const resources = Object.fromEntries(languages.map(l => [l, {
  translation: JSON.parse(readFileSync(new URL(`../src/i18n/locales/${l}.json`, import.meta.url), 'utf8')),
}]));
const i18n = i18next.createInstance();
await i18n.init({ resources, lng: 'en', fallbackLng: false, interpolation: { escapeValue: false } });

it('admin role wins over a 10-slot capacity', () => {
  assert.deepEqual(planSummary({ isAdmin: true, isTrialActive: false, subscriptionStatus: 'active', accountSlots: 10 }), { kind: 'admin' });
});
it('10 slots without the admin role is not shown as admin', () => {
  assert.deepEqual(planSummary({ isAdmin: false, isTrialActive: false, subscriptionStatus: 'active', accountSlots: 10 }), { kind: 'paid', aiTags: 10 });
});
it('trial user sees trial state', () => {
  assert.deepEqual(planSummary({ isAdmin: false, isTrialActive: true, subscriptionStatus: 'trialing', accountSlots: 1 }), { kind: 'trial' });
});

const expected = {
  en: ['Admin access', 'AI access for 1 player tag', 'AI access for 2 player tags', 'AI access for 3 player tags', '3 days left'],
  tr: ['Yönetici erişimi', '1 oyuncu etiketi için AI erişimi', '2 oyuncu etiketi için AI erişimi', '3 oyuncu etiketi için AI erişimi', '3 gün kaldı'],
  es: ['Acceso de administrador', 'Acceso a IA para 1 etiqueta de jugador', 'Acceso a IA para 2 etiquetas de jugador', 'Acceso a IA para 3 etiquetas de jugador', null],
  fr: ['Accès administrateur', 'Accès IA pour 1 tag joueur', 'Accès IA pour 2 tags joueur', 'Accès IA pour 3 tags joueur', null],
  pt: ['Acesso de administrador', 'Acesso à IA para 1 tag de jogador', 'Acesso à IA para 2 tags de jogador', 'Acesso à IA para 3 tags de jogador', null],
};
for (const l of languages) {
  it(`${l}: admin, 1/2/3 AI tags and trial copy`, () => {
    const t = i18n.getFixedT(l);
    const [admin, one, two, three, trial] = expected[l];
    assert.equal(t('subscription.adminAccess'), admin);
    assert.equal(t('subscription.aiTagAccessOne', { count: 1 }), one);
    assert.equal(t('subscription.aiTagAccessMany', { count: 2 }), two);
    assert.equal(t('subscription.aiTagAccessMany', { count: 3 }), three);
    const trialText = t('subscription.trialDaysLeft', { days: 3 });
    if (trial) assert.equal(trialText, trial); else assert.match(trialText, /3/);
  });
}
