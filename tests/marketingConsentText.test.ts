import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import { MARKETING_TEXT_VERSION } from '../src/lib/marketingConsent';

// The checkbox the player sees must be exactly the immutable text stored as proof for that version.
it('shows the stored consent text for every language', () => {
  const sql = readFileSync('drizzle/migrations/0020_marketing_consent.sql', 'utf8');
  for (const lang of ['en', 'tr', 'es', 'fr', 'pt']) {
    const shown = JSON.parse(readFileSync(`src/i18n/locales/${lang}.json`, 'utf8')).marketing.text as string;
    assert.ok(sql.includes(`('${MARKETING_TEXT_VERSION}','${lang}','${shown.replace(/'/g, "''")}')`), lang);
    assert.match(shown, /Fittechs Yazılım Anonim Şirketi/);
  }
});
