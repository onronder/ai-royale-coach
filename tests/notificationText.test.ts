import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import { createInstance } from 'i18next';
import { notificationReader } from '../src/i18n/notificationText';

it('reads existing system and named achievement notifications in each selected language and preserves custom text', async () => {
  const languages = ['en', 'tr', 'fr', 'es', 'pt'];
  const resources = Object.fromEntries(languages.map(lang => [lang, {
    translation: JSON.parse(readFileSync(new URL('../src/i18n/locales/' + lang + '.json', import.meta.url), 'utf8')),
  }]));
  const i18n = createInstance();
  await i18n.init({ resources, lng: 'fr' });
  const read = notificationReader(i18n, languages);
  const saved = { type: 'sync', title: i18n.t('cardCollection.syncedTitle'), message: i18n.t('cardCollection.syncedMessage') };
  const id = Object.keys(resources.fr.translation.achievements.catalog)[0];
  const badge = () => i18n.t('toasts.achievementUnlocked') + ' ' + i18n.t('achievements.catalog.' + id + '.title');
  const award = { type: 'achievement', title: badge(), message: i18n.t('achievements.unlockedNew') };
  for (const lang of languages) {
    await i18n.changeLanguage(lang);
    assert.deepEqual(read(saved), { title: i18n.t('cardCollection.syncedTitle'), message: i18n.t('cardCollection.syncedMessage') });
    assert.deepEqual(read(award), { title: badge(), message: i18n.t('achievements.unlockedNew') });
  }
  const custom = { ...saved, message: 'Independent notice' };
  assert.strictEqual(read(custom), custom);
});
