import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sources = ['pages/Help.tsx', 'components/help/HelpDialog.tsx', 'utils/helpTopicMatcher.ts'];
const keys = new Set(sources.flatMap(path =>
  [...read('../src/' + path).matchAll(/["'](help\.[\w.]+)["']/g)].map(match => match[1])
));

for (const language of ['tr', 'en', 'es', 'fr', 'pt']) {
  it(`resolves Help articles, dialog labels and coach excerpts in ${language}`, () => {
    const dictionary = JSON.parse(read(`../src/i18n/locales/${language}.help.json`));
    for (const key of keys) {
      const value = key.split('.').reduce((branch, part) => branch?.[part], dictionary);
      assert.ok(typeof value === 'string' && value.trim(), key);
    }
  });
}
