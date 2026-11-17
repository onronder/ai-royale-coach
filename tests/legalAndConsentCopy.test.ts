import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';

const LANGS = ['tr', 'en', 'es', 'fr', 'pt'] as const;
const loc = (l: string) => JSON.parse(readFileSync(`src/i18n/locales/${l}.json`, 'utf8'));
const flat = (o: unknown, p = ''): Record<string, string> => Object.assign({}, ...Object.entries(o as object).map(([k, v]) =>
  typeof v === 'object' && v ? flat(v, p + k + '.') : { [p + k]: String(v) }));

it('720-hour win-back rule: exact Turkish wording, all five languages say 720 hours', () => {
  assert.equal(loc('tr').marketing.reason.cooldown, 'Yeni bir geri kazanım e-postası için son e-postanın kabulünden bu yana 720 saatten fazla geçmiş olmalı.');
  for (const l of LANGS) {
    const r = loc(l).marketing.reason;
    assert.match(r.cooldown, /720/, l); assert.match(r.cooldown_unverified, /720/, l);
    // The date next to the button is the moment the account STILL waits; the copy must say "after", not "until".
    assert.match(loc(l).admin.winback.until, /\{\{date\}\}/, l);
  }
  assert.match(loc('tr').admin.winback.until, /sonrasında/);
  assert.match(loc('en').admin.winback.until, /after/);
});

it('legal and consent keys exist in all five languages and are really translated', () => {
  const base = Object.keys(flat({ legal: loc('en').legal, marketing: loc('en').marketing })).sort();
  for (const l of LANGS) {
    const f = flat({ legal: loc(l).legal, marketing: loc(l).marketing });
    assert.deepEqual(Object.keys(f).sort(), base, l);
    if (l !== 'en') for (const k of ['legal.privacy.emails.content', 'legal.terms.marketingChoice.content', 'marketing.inviteNote']) assert.notEqual(f[k], flat({ legal: loc('en').legal, marketing: loc('en').marketing })[k], `${l} ${k}`);
  }
});

it('privacy and terms name the controller, the support address and the campaign clause; old claims are gone', () => {
  for (const l of LANGS) {
    const lg = loc(l).legal;
    assert.match(lg.privacy.controller.content, /Fittechs Yazılım Anonim Şirketi/);
    assert.match(lg.privacy.controller.content + lg.privacy.rights.content, /support@fittechs\.com/, l);
    for (const k of ['gdpr', 'ccpa', 'kvkk']) assert.equal(lg.privacy[k], undefined, `${l}: unverified compliance claim ${k}`);
    const all = JSON.stringify(lg);
    assert.doesNotMatch(all, /30 g(ün|ays)|30 d(ays|ías|ias)|30 jours|5-30/, `${l}: unverified retention period`);
  }
  const tr = JSON.stringify(loc('tr').legal), en = JSON.stringify(loc('en').legal);
  assert.doesNotMatch(tr, /Yalnızca hesap doğrulama ve şifre kurtarma/);
  assert.doesNotMatch(tr, /reklam veya pazarlama amaçlı kullanmıyoruz/);
  assert.doesNotMatch(en, /only for account verification and password recovery/i);
  assert.match(loc('tr').legal.terms.marketingChoice.content,
    /^AI Royale hesabı açmak, ücretli abone olmak veya deneme başlatmak kampanya e-postası izni oluşturmaz\. Kampanya iletişim tercihinizi hesabınızdan yönetebilirsiniz\./);
  assert.equal(loc('tr').marketing.inviteNote,
    'Bu seçim isteğe bağlıdır. İzin vermeden de AI Royale’i kullanabilirsin. Tercihini istediğin zaman E-posta Tercihleri’nden veya kampanya e-postasındaki bağlantıdan değiştirebilirsin.');
});
